import uuid
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from app.core.specialties import MEDICAL_SPECIALTIES

from app.database import get_async_db
from app.models.user import User, UserRole
from app.models.doctor import DoctorProfile, DoctorAvailability
from app.models.patient import PatientProfile
from app.models.appointment import Appointment, AppointmentStatus
from app.models.consultation import Consultation
from app.models.prescription import Prescription
from app.models.feedback import Feedback
from app.schemas.admin import DoctorCreateByAdmin, PlatformStatsResponse
from app.schemas.user import DoctorProfileResponse, PatientProfileResponse
from app.schemas.appointment import AppointmentResponse
from app.schemas.feedback import FeedbackResponse
from app.core.security import get_password_hash
from app.api.deps import require_roles

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

@router.get("/stats", response_model=PlatformStatsResponse)
async def get_platform_stats(
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    total_patients = (await db.execute(select(func.count(PatientProfile.id)))).scalar() or 0
    total_doctors = (await db.execute(select(func.count(DoctorProfile.id)))).scalar() or 0
    total_appts = (await db.execute(select(func.count(Appointment.id)))).scalar() or 0
    completed_cons = (
        await db.execute(select(func.count(Appointment.id)).where(Appointment.status == AppointmentStatus.COMPLETED))
    ).scalar() or 0
    total_rx = (await db.execute(select(func.count(Prescription.id)))).scalar() or 0
    avg_rating = (await db.execute(select(func.avg(DoctorProfile.rating)))).scalar() or 4.8

    # Recent 5 appointments
    recent_stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.doctor),
            selectinload(Appointment.patient),
            selectinload(Appointment.consultation)
        )
        .order_by(desc(Appointment.created_at))
        .limit(5)
    )
    recent_res = await db.execute(recent_stmt)
    recent_appts = []
    for appt in recent_res.scalars().all():
        d = AppointmentResponse.model_validate(appt)
        if appt.consultation:
            d.room_id = appt.consultation.room_id
        recent_appts.append(d)

    return PlatformStatsResponse(
        total_patients=total_patients,
        total_doctors=total_doctors,
        total_appointments=total_appts,
        completed_consultations=completed_cons,
        total_prescriptions=total_rx,
        average_doctor_rating=0.0,
        recent_appointments=recent_appts
    )

@router.post("/upload-photo")
async def upload_doctor_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Invalid image format. Allowed: JPEG, PNG, WEBP.")
    
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image file size exceeds 5MB limit.")

    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    file_name = f"{uuid.uuid4().hex}.{ext}"
    upload_dir = os.path.join(os.getcwd(), "uploads", "doctors")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file_name)

    with open(file_path, "wb") as f:
        f.write(contents)

    return {"avatar_url": f"/uploads/doctors/{file_name}"}

@router.post("/doctors", response_model=DoctorProfileResponse)
async def create_doctor(
    payload: DoctorCreateByAdmin,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    if payload.specialty not in MEDICAL_SPECIALTIES:
        raise HTTPException(
            status_code=400,
            detail=f"Specialty must be one of: {', '.join(MEDICAL_SPECIALTIES)}"
        )

    # Check if email exists
    stmt = select(User).where(User.email == payload.email.lower())
    if (await db.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    # Doctors DO NOT require OTP: is_verified=True directly
    user = User(
        email=payload.email.lower(),
        username=payload.email.lower(),
        hashed_password=get_password_hash(payload.password),
        role=UserRole.DOCTOR,
        is_active=True,
        is_verified=True
    )
    db.add(user)
    await db.flush()

    doctor_profile = DoctorProfile(
        user_id=user.id,
        full_name=payload.full_name,
        qualification=payload.qualification,
        specialty=payload.specialty,
        experience_years=payload.experience_years,
        hospital_name=payload.hospital_name,
        consultation_fee=payload.consultation_fee,
        bio=payload.bio,
        avatar_url=payload.avatar_url or "/default-doctor.png",
        is_verified=True
    )
    db.add(doctor_profile)
    await db.flush()

    # ZERO INITIAL SLOTS: Doctors start with NO slots. Doctors create their own slots from /admin.
    await db.commit()
    await db.refresh(doctor_profile)
    return doctor_profile

@router.get("/doctors", response_model=List[DoctorProfileResponse])
async def list_all_doctors(
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    stmt = select(DoctorProfile).order_by(DoctorProfile.id.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.delete("/doctors/{doctor_id}")
async def delete_doctor(
    doctor_id: int,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    stmt = select(DoctorProfile).where(DoctorProfile.id == doctor_id)
    res = await db.execute(stmt)
    doctor = res.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    user_stmt = select(User).where(User.id == doctor.user_id)
    user = (await db.execute(user_stmt)).scalar_one_or_none()
    if user:
        await db.delete(user)
    else:
        await db.delete(doctor)

    await db.commit()
    return {"success": True, "message": f"Doctor {doctor.full_name} has been deleted successfully."}
