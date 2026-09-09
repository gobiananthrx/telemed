from typing import List, Optional
from datetime import date, datetime, timedelta, time as dt_time
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload

from app.database import get_async_db
from app.models.doctor import DoctorProfile, DoctorAvailability, DoctorSlot
from app.models.patient import PatientProfile
from app.models.appointment import Appointment, AppointmentStatus
from app.models.consultation import Consultation
from app.models.prescription import Prescription
from app.models.user import User, UserRole
from app.schemas.user import DoctorProfileResponse
from app.schemas.doctor import (
    DaySlotsResponse, AvailabilitySlot,
    DoctorSlotCreate, DoctorSlotBatchCreate, DoctorSlotResponse,
    DoctorAvailabilityCreate, DoctorAvailabilityResponse
)
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/doctors", tags=["Doctors"])

def get_slot_period(t: dt_time) -> str:
    if t.hour < 12:
        return "Morning"
    elif t.hour < 16:
        return "Afternoon"
    else:
        return "Evening"

@router.get("", response_model=List[DoctorProfileResponse])
async def list_doctors(
    search: Optional[str] = Query(None, description="Search by name, hospital, or specialty"),
    specialty: Optional[str] = Query(None, description="Filter by specialty"),
    db: AsyncSession = Depends(get_async_db)
):
    stmt = select(DoctorProfile).where(DoctorProfile.is_verified == True)

    if specialty and specialty.lower() != "all":
        stmt = stmt.where(func.lower(DoctorProfile.specialty) == specialty.lower())

    if search:
        search_term = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(DoctorProfile.full_name).like(search_term),
                func.lower(DoctorProfile.specialty).like(search_term),
                func.lower(DoctorProfile.hospital_name).like(search_term)
            )
        )

    # Order by experience and id; eliminate rating
    stmt = stmt.order_by(DoctorProfile.experience_years.desc(), DoctorProfile.id.asc())
    res = await db.execute(stmt)
    doctors = res.scalars().all()
    return doctors

@router.get("/specialties", response_model=List[dict])
async def list_specialties(db: AsyncSession = Depends(get_async_db)):
    stmt = (
        select(DoctorProfile.specialty, func.count(DoctorProfile.id))
        .where(DoctorProfile.is_verified == True)
        .group_by(DoctorProfile.specialty)
    )
    res = await db.execute(stmt)
    rows = res.all()
    return [{"specialty": row[0], "count": row[1]} for row in rows]

@router.get("/{doctor_id}", response_model=DoctorProfileResponse)
async def get_doctor_profile(doctor_id: int, db: AsyncSession = Depends(get_async_db)):
    stmt = select(DoctorProfile).where(DoctorProfile.id == doctor_id)
    res = await db.execute(stmt)
    doctor = res.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return doctor

@router.get("/me/slots", response_model=List[DoctorSlotResponse])
async def get_my_slots(
    date_filter: Optional[date] = Query(None, alias="date"),
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    if not current_user.doctor_profile:
        raise HTTPException(status_code=400, detail="Doctor profile not found")

    doctor_id = current_user.doctor_profile.id
    stmt = select(DoctorSlot).where(DoctorSlot.doctor_id == doctor_id)
    if date_filter:
        stmt = stmt.where(DoctorSlot.date == date_filter)
    stmt = stmt.order_by(DoctorSlot.date.asc(), DoctorSlot.start_time.asc())
    res = await db.execute(stmt)
    slots = res.scalars().all()
    return [
        DoctorSlotResponse(
            id=s.id,
            doctor_id=s.doctor_id,
            date=s.date.isoformat(),
            start_time=s.start_time.strftime("%H:%M"),
            end_time=s.end_time.strftime("%H:%M"),
            is_available=s.is_available
        )
        for s in slots
    ]

@router.post("/me/slots", response_model=List[DoctorSlotResponse])
async def create_my_slots(
    payload: DoctorSlotBatchCreate,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    if not current_user.doctor_profile:
        raise HTTPException(status_code=400, detail="Doctor profile not found")

    doctor_id = current_user.doctor_profile.id

    try:
        slot_date = datetime.strptime(payload.date, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    today = datetime.now().date()
    if slot_date < today:
        raise HTTPException(status_code=400, detail="Cannot create slots for past dates")

    dur_mins = payload.duration_minutes or payload.slot_duration_minutes or 30

    try:
        st_parts = [int(p) for p in payload.start_time.split(":")]
        start_t = dt_time(st_parts[0], st_parts[1])
        if payload.end_time:
            et_parts = [int(p) for p in payload.end_time.split(":")]
            end_t = dt_time(et_parts[0], et_parts[1])
        else:
            end_dt = datetime.combine(slot_date, start_t) + timedelta(minutes=dur_mins)
            end_t = end_dt.time()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")

    if start_t >= end_t:
        raise HTTPException(status_code=400, detail="Start time must be before end time")

    if slot_date == today and start_t <= datetime.now().time():
        raise HTTPException(status_code=400, detail="Cannot create slots in the past for today")

    # Fetch existing slots for this doctor and date to prevent overlaps
    existing_stmt = select(DoctorSlot).where(
        DoctorSlot.doctor_id == doctor_id,
        DoctorSlot.date == slot_date
    )
    existing_slots = (await db.execute(existing_stmt)).scalars().all()
    existing_intervals = [(s.start_time, s.end_time) for s in existing_slots]

    # Generate slots
    duration = timedelta(minutes=dur_mins)
    cur_dt = datetime.combine(slot_date, start_t)
    end_dt = datetime.combine(slot_date, end_t)

    new_slots = []
    while cur_dt + duration <= end_dt:
        s_time = cur_dt.time()
        e_time = (cur_dt + duration).time()

        # Check conflict
        for ex_start, ex_end in existing_intervals:
            if max(s_time, ex_start) < min(e_time, ex_end):
                raise HTTPException(
                    status_code=400,
                    detail=f"Conflicting slot detected between {s_time.strftime('%H:%M')} and {e_time.strftime('%H:%M')}."
                )

        slot = DoctorSlot(
            doctor_id=doctor_id,
            date=slot_date,
            start_time=s_time,
            end_time=e_time,
            is_available=True
        )
        db.add(slot)
        new_slots.append(slot)
        existing_intervals.append((s_time, e_time))
        cur_dt += duration

    if not new_slots:
        raise HTTPException(status_code=400, detail="No valid slots could be generated with the given duration.")

    await db.commit()
    for s in new_slots:
        await db.refresh(s)

    return [
        DoctorSlotResponse(
            id=s.id,
            doctor_id=s.doctor_id,
            date=s.date.isoformat(),
            start_time=s.start_time.strftime("%H:%M"),
            end_time=s.end_time.strftime("%H:%M"),
            is_available=s.is_available
        )
        for s in new_slots
    ]

@router.delete("/me/slots/{slot_id}")
async def delete_my_slot(
    slot_id: int,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    if not current_user.doctor_profile:
        raise HTTPException(status_code=400, detail="Doctor profile not found")

    doctor_id = current_user.doctor_profile.id
    stmt = select(DoctorSlot).where(DoctorSlot.id == slot_id, DoctorSlot.doctor_id == doctor_id)
    res = await db.execute(stmt)
    slot = res.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    if not slot.is_available:
        raise HTTPException(status_code=400, detail="Cannot delete a slot that has already been booked.")

    await db.delete(slot)
    await db.commit()
    return {"success": True, "message": "Slot deleted successfully"}

@router.get("/me/patients")
async def get_my_patients(
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    if not current_user.doctor_profile:
        raise HTTPException(status_code=400, detail="Doctor profile not found")

    doctor_id = current_user.doctor_profile.id
    stmt = (
        select(PatientProfile)
        .join(Appointment, Appointment.patient_id == PatientProfile.id)
        .where(Appointment.doctor_id == doctor_id)
        .distinct()
    )
    res = await db.execute(stmt)
    patients = res.scalars().all()

    patient_list = []
    for p in patients:
        appt_count = (
            await db.execute(
                select(func.count(Appointment.id)).where(
                    Appointment.doctor_id == doctor_id,
                    Appointment.patient_id == p.id
                )
            )
        ).scalar() or 0

        patient_list.append({
            "id": p.id,
            "full_name": p.full_name,
            "uhid": p.uhid,
            "phone": p.phone,
            "city": p.city,
            "blood_group": p.blood_group,
            "gender": p.gender,
            "date_of_birth": p.date_of_birth.isoformat() if p.date_of_birth else None,
            "appointment_count": appt_count
        })

    return patient_list

@router.get("/me/patients/{patient_id}/history")
async def get_patient_clinical_history(
    patient_id: int,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    if not current_user.doctor_profile:
        raise HTTPException(status_code=400, detail="Doctor profile not found")

    doctor_id = current_user.doctor_profile.id

    # Check authorization: Doctor must have an appointment with this patient
    auth_stmt = select(Appointment).where(
        Appointment.doctor_id == doctor_id,
        Appointment.patient_id == patient_id
    )
    has_appointment = (await db.execute(auth_stmt)).scalars().first()
    if not has_appointment:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized. You can only view clinical records of patients who have consulted with you."
        )

    patient_stmt = select(PatientProfile).where(PatientProfile.id == patient_id)
    patient = (await db.execute(patient_stmt)).scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    cons_stmt = (
        select(Consultation)
        .options(selectinload(Consultation.doctor), selectinload(Consultation.appointment))
        .where(Consultation.patient_id == patient_id)
        .order_by(Consultation.created_at.desc())
    )
    consultations = (await db.execute(cons_stmt)).scalars().all()

    rx_stmt = (
        select(Prescription)
        .options(selectinload(Prescription.doctor), selectinload(Prescription.medicines))
        .where(Prescription.patient_id == patient_id)
        .order_by(Prescription.created_at.desc())
    )
    prescriptions = (await db.execute(rx_stmt)).scalars().all()

    patient_info = {
        "id": patient.id,
        "full_name": patient.full_name,
        "uhid": patient.uhid,
        "phone": patient.phone,
        "city": patient.city,
        "blood_group": patient.blood_group,
        "gender": patient.gender,
        "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
        "emergency_contact": patient.emergency_contact
    }

    return {
        "patient": patient_info,
        "demographics": patient_info,
        "consultations": [
            {
                "id": c.id,
                "room_id": c.room_id,
                "doctor_name": c.doctor.full_name if c.doctor else "Doctor",
                "doctor_specialty": c.doctor.specialty if c.doctor else "",
                "status": c.status.value,
                "date": c.appointment.date.isoformat() if c.appointment else None,
                "clinical_notes": c.clinical_notes,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in consultations
        ],
        "prescriptions": [
            {
                "id": r.id,
                "rx_number": r.rx_number,
                "doctor_name": r.doctor.full_name if r.doctor else "Doctor",
                "diagnosis": r.diagnosis,
                "notes": r.notes,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "medicines": [
                    {
                        "name": m.medicine_name,
                        "dosage": m.dosage,
                        "frequency": m.frequency,
                        "duration": m.duration,
                        "timing": m.timing.value if hasattr(m.timing, "value") else str(m.timing),
                        "instructions": m.instructions
                    }
                    for m in r.medicines
                ]
            }
            for r in prescriptions
        ]
    }

@router.get("/{doctor_id}/slots", response_model=DaySlotsResponse)
async def get_doctor_slots_for_date(
    doctor_id: int,
    target_date: Optional[date] = Query(None, description="Target date in YYYY-MM-DD format"),
    date: Optional[date] = Query(None, description="Alternative target date in YYYY-MM-DD format"),
    slot_date: Optional[date] = Query(None, description="Alternative target date in YYYY-MM-DD format"),
    date_val: Optional[date] = Query(None, description="Alternative target date"),
    db: AsyncSession = Depends(get_async_db)
):
    chosen_date = target_date or date or slot_date or date_val or datetime.now().date()
    # Verify doctor exists
    doc_stmt = select(DoctorProfile).where(DoctorProfile.id == doctor_id)
    doctor = (await db.execute(doc_stmt)).scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Fetch dynamic slots created by doctor
    stmt = (
        select(DoctorSlot)
        .where(
            DoctorSlot.doctor_id == doctor_id,
            DoctorSlot.date == chosen_date
        )
        .order_by(DoctorSlot.start_time.asc())
    )
    res = await db.execute(stmt)
    db_slots = res.scalars().all()

    now_dt = datetime.now()
    slots = []
    for s in db_slots:
        # Filter out past slots for the current day
        if chosen_date == now_dt.date() and s.start_time <= now_dt.time():
            continue
        slots.append(AvailabilitySlot(
            id=s.id,
            time=s.start_time.strftime("%H:%M"),
            end_time=s.end_time.strftime("%H:%M"),
            formatted_time=s.start_time.strftime("%I:%M %p").lstrip("0"),
            is_available=s.is_available,
            period=get_slot_period(s.start_time)
        ))

    return DaySlotsResponse(
        date=chosen_date.isoformat(),
        day_name=chosen_date.strftime("%A"),
        slots=slots
    )
