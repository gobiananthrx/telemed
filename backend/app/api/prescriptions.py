import random
import string
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.database import get_async_db
from app.models.prescription import Prescription, PrescriptionMedicine
from app.models.consultation import Consultation
from app.models.appointment import Appointment
from app.models.patient import PatientProfile
from app.models.user import User, UserRole
from app.models.notification import NotificationType
from app.schemas.prescription import PrescriptionCreate, PrescriptionResponse
from app.services.notification_service import create_notification
from app.api.deps import get_current_verified_user, require_roles

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

def generate_rx_number() -> str:
    digits = "".join(random.choices(string.digits, k=5))
    return f"#MED-{digits}-TX"

@router.post("", response_model=PrescriptionResponse)
async def create_prescription(
    payload: PrescriptionCreate,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    consultation = None
    if payload.consultation_id:
        c_stmt = (
            select(Consultation)
            .options(selectinload(Consultation.prescription), selectinload(Consultation.appointment))
            .where(Consultation.id == payload.consultation_id)
        )
        consultation = (await db.execute(c_stmt)).scalar_one_or_none()
    elif payload.appointment_id:
        c_stmt = (
            select(Consultation)
            .options(selectinload(Consultation.prescription), selectinload(Consultation.appointment))
            .where(Consultation.appointment_id == payload.appointment_id)
        )
        consultation = (await db.execute(c_stmt)).scalar_one_or_none()

    if not consultation:
        raise HTTPException(
            status_code=400,
            detail="A completed or active consultation is required before issuing a digital prescription."
        )

    # Doctor ownership check
    if current_user.role == UserRole.DOCTOR:
        if not current_user.doctor_profile or consultation.doctor_id != current_user.doctor_profile.id:
            raise HTTPException(
                status_code=403,
                detail="You can only issue prescriptions for consultations conducted by you."
            )
        doctor_id = current_user.doctor_profile.id
    else:
        doctor_id = consultation.doctor_id

    # Exactly one prescription per consultation
    existing_rx = (
        await db.execute(select(Prescription).where(Prescription.consultation_id == consultation.id))
    ).scalar_one_or_none()
    if existing_rx or consultation.prescription is not None:
        raise HTTPException(
            status_code=400,
            detail="A digital prescription has already been issued for this consultation. Only one prescription is allowed per consultation."
        )

    rx_num = generate_rx_number()
    prescription = Prescription(
        rx_number=rx_num,
        appointment_id=consultation.appointment_id,
        consultation_id=consultation.id,
        patient_id=consultation.patient_id,
        doctor_id=doctor_id,
        diagnosis=payload.diagnosis,
        notes=payload.notes,
        follow_up_date=payload.follow_up_date
    )
    db.add(prescription)
    await db.flush()

    # Add line items
    for med in payload.medicines:
        med_item = PrescriptionMedicine(
            prescription_id=prescription.id,
            medicine_name=med.medicine_name,
            dosage=med.dosage,
            frequency=med.frequency,
            duration=med.duration,
            timing=med.timing,
            instructions=med.instructions
        )
        db.add(med_item)

    # Notify patient
    doc_name = current_user.doctor_profile.full_name if (current_user.doctor_profile and current_user.doctor_profile.full_name) else "Your Doctor"
    patient_stmt = select(PatientProfile).where(PatientProfile.id == payload.patient_id)
    patient = (await db.execute(patient_stmt)).scalar_one_or_none()
    if patient:
        await create_notification(
            db=db,
            user_id=patient.user_id,
            title="Prescription Issued",
            message=f"Dr. {doc_name} has issued digital prescription {rx_num} for {payload.diagnosis}.",
            notification_type=NotificationType.PRESCRIPTION,
            link=f"/prescriptions/{prescription.id}"
        )

    await db.commit()

    # Reload with full data
    stmt = (
        select(Prescription)
        .options(
            selectinload(Prescription.medicines),
            selectinload(Prescription.doctor),
            selectinload(Prescription.patient)
        )
        .where(Prescription.id == prescription.id)
    )
    res = await db.execute(stmt)
    return res.scalar_one()

@router.get("", response_model=List[PrescriptionResponse])
async def list_prescriptions(
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_async_db)
):
    stmt = (
        select(Prescription)
        .options(
            selectinload(Prescription.medicines),
            selectinload(Prescription.doctor),
            selectinload(Prescription.patient)
        )
    )

    if current_user.role == UserRole.PATIENT:
        if not current_user.patient_profile:
            return []
        stmt = stmt.where(Prescription.patient_id == current_user.patient_profile.id)
    elif current_user.role == UserRole.DOCTOR:
        if not current_user.doctor_profile:
            return []
        stmt = stmt.where(Prescription.doctor_id == current_user.doctor_profile.id)

    stmt = stmt.order_by(desc(Prescription.created_at))
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{prescription_id}", response_model=PrescriptionResponse)
async def get_prescription(
    prescription_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_async_db)
):
    stmt = (
        select(Prescription)
        .options(
            selectinload(Prescription.medicines),
            selectinload(Prescription.doctor),
            selectinload(Prescription.patient)
        )
        .where(Prescription.id == prescription_id)
    )
    res = await db.execute(stmt)
    rx = res.scalar_one_or_none()

    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    if current_user.role == UserRole.PATIENT:
        if not current_user.patient_profile or rx.patient_id != current_user.patient_profile.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == UserRole.DOCTOR:
        if not current_user.doctor_profile or rx.doctor_id != current_user.doctor_profile.id:
            raise HTTPException(status_code=403, detail="Access denied")

    return rx
