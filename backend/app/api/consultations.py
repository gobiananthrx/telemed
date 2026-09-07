import random
import string
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_async_db
from app.models.consultation import Consultation, ConsultationStatus
from app.models.appointment import Appointment, AppointmentStatus
from app.models.user import User, UserRole
from app.models.notification import NotificationType
from app.schemas.consultation import ConsultationResponse, ConsultationEnd
from app.services.notification_service import create_notification
from app.api.deps import get_current_verified_user, require_roles

router = APIRouter(prefix="/consultations", tags=["Consultations"])

def validate_time_window(appointment: Appointment, buffer_minutes_before: int = 10, buffer_minutes_after: int = 15):
    """
    Validates that current server time is within the appointment's scheduled slot.
    Handles small clock differences with a reasonable buffer.
    """
    now_dt = datetime.now()
    start_dt = datetime.combine(appointment.date, appointment.start_time)
    end_dt = datetime.combine(appointment.date, appointment.end_time)

    if now_dt < start_dt - timedelta(minutes=buffer_minutes_before):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Consultation not started yet. Scheduled for {appointment.date.strftime('%d %b %Y')} from {appointment.start_time.strftime('%H:%M')} to {appointment.end_time.strftime('%H:%M')}."
        )

    if now_dt > end_dt + timedelta(minutes=buffer_minutes_after):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Consultation time slot has ended. Scheduled was {appointment.start_time.strftime('%H:%M')} - {appointment.end_time.strftime('%H:%M')}."
        )

@router.post("/start/{appointment_id}", response_model=ConsultationResponse)
async def start_consultation_for_appointment(
    appointment_id: int,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Doctor creates/starts the consultation record from the doctor panel (Section 8).
    Patients CANNOT arbitrarily create consultation records.
    Enforces time restriction (Section 9) and doctor ownership (Section 10).
    """
    stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.doctor),
            selectinload(Appointment.patient),
            selectinload(Appointment.consultation)
        )
        .where(Appointment.id == appointment_id)
    )
    res = await db.execute(stmt)
    appointment = res.scalar_one_or_none()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Authorize: Only the assigned doctor or admin
    if current_user.role == UserRole.DOCTOR:
        if not current_user.doctor_profile or appointment.doctor_id != current_user.doctor_profile.id:
            raise HTTPException(status_code=403, detail="You are not the assigned doctor for this appointment")

    # Validate time window
    validate_time_window(appointment)

    # If consultation already exists, return it
    if appointment.consultation:
        return appointment.consultation

    # Create new consultation
    room_id = f"telemed-{appointment.appointment_number.replace('#', '').lower()}"
    consultation = Consultation(
        appointment_id=appointment.id,
        room_id=room_id,
        doctor_id=appointment.doctor_id,
        patient_id=appointment.patient_id,
        status=ConsultationStatus.WAITING,
        doctor_joined=True,
        doctor_joined_at=datetime.now(timezone.utc)
    )
    db.add(consultation)

    # Notify patient that consultation has been opened by doctor
    if appointment.patient and appointment.patient.user_id:
        doc_name = appointment.doctor.full_name if appointment.doctor else "Doctor"
        await create_notification(
            db=db,
            user_id=appointment.patient.user_id,
            title="Consultation Started",
            message=f"Dr. {doc_name} has started your consultation room ({room_id}). You can join now.",
            notification_type=NotificationType.CONSULTATION,
            link=f"/consultation/{room_id}"
        )

    await db.commit()

    # Reload consultation
    c_stmt = (
        select(Consultation)
        .options(
            selectinload(Consultation.doctor),
            selectinload(Consultation.patient),
            selectinload(Consultation.appointment)
        )
        .where(Consultation.id == consultation.id)
    )
    c_res = await db.execute(c_stmt)
    return c_res.scalar_one()

@router.get("/{room_id}", response_model=ConsultationResponse)
async def get_consultation_by_room(
    room_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_async_db)
):
    stmt = (
        select(Consultation)
        .options(
            selectinload(Consultation.doctor),
            selectinload(Consultation.patient),
            selectinload(Consultation.appointment)
        )
        .where(Consultation.room_id == room_id)
    )
    res = await db.execute(stmt)
    consultation = res.scalar_one_or_none()

    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation room not found. Doctor must start the consultation first.")

    # Verify authorization (Section 10)
    if current_user.role == UserRole.PATIENT:
        if not current_user.patient_profile or consultation.patient_id != current_user.patient_profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this consultation room")
    elif current_user.role == UserRole.DOCTOR:
        if not current_user.doctor_profile or consultation.doctor_id != current_user.doctor_profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this consultation room")

    # Enforce time restriction if appointment attached and not yet completed
    if consultation.appointment and consultation.status != ConsultationStatus.COMPLETED:
        validate_time_window(consultation.appointment)

    return consultation

@router.post("/{room_id}/join", response_model=ConsultationResponse)
async def join_consultation(
    room_id: str,
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_async_db)
):
    stmt = (
        select(Consultation)
        .options(
            selectinload(Consultation.doctor),
            selectinload(Consultation.patient),
            selectinload(Consultation.appointment)
        )
        .where(Consultation.room_id == room_id)
    )
    res = await db.execute(stmt)
    consultation = res.scalar_one_or_none()

    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation room not found")

    # Authorization Check
    if current_user.role == UserRole.PATIENT:
        if not current_user.patient_profile or consultation.patient_id != current_user.patient_profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to join this consultation room")
    elif current_user.role == UserRole.DOCTOR:
        if not current_user.doctor_profile or consultation.doctor_id != current_user.doctor_profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to join this consultation room")

    # Time window validation
    if consultation.appointment and consultation.status != ConsultationStatus.COMPLETED:
        validate_time_window(consultation.appointment)

    now = datetime.now(timezone.utc)

    if current_user.role == UserRole.DOCTOR:
        consultation.doctor_joined = True
        consultation.doctor_joined_at = now
    elif current_user.role == UserRole.PATIENT:
        consultation.patient_joined = True
        consultation.patient_joined_at = now

    if consultation.doctor_joined_at and consultation.patient_joined_at:
        consultation.status = ConsultationStatus.ACTIVE
        if not consultation.started_at:
            consultation.started_at = now
        if consultation.appointment:
            consultation.appointment.status = AppointmentStatus.IN_PROGRESS

    await db.commit()
    await db.refresh(consultation)
    return consultation

@router.post("/{room_id}/end", response_model=ConsultationResponse)
async def end_consultation(
    room_id: str,
    payload: ConsultationEnd = None,
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_async_db)
):
    stmt = (
        select(Consultation)
        .options(
            selectinload(Consultation.doctor),
            selectinload(Consultation.patient),
            selectinload(Consultation.appointment)
        )
        .where(Consultation.room_id == room_id)
    )
    res = await db.execute(stmt)
    consultation = res.scalar_one_or_none()

    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation room not found")

    # Authorization Check
    if current_user.role == UserRole.PATIENT:
        if not current_user.patient_profile or consultation.patient_id != current_user.patient_profile.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == UserRole.DOCTOR:
        if not current_user.doctor_profile or consultation.doctor_id != current_user.doctor_profile.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    now = datetime.now(timezone.utc)
    consultation.ended_at = now
    consultation.status = ConsultationStatus.COMPLETED

    if consultation.started_at:
        duration = (now - consultation.started_at).total_seconds()
        consultation.duration_seconds = max(int(duration), 60)
    else:
        consultation.duration_seconds = 180

    if payload and payload.clinical_notes:
        consultation.clinical_notes = payload.clinical_notes

    if consultation.appointment:
        consultation.appointment.status = AppointmentStatus.COMPLETED

    # Notify patient that consultation has concluded
    if consultation.patient and consultation.patient.user_id:
        await create_notification(
            db=db,
            user_id=consultation.patient.user_id,
            title="Consultation Completed",
            message="Your video consultation has ended. Your doctor will issue your prescription shortly.",
            notification_type=NotificationType.CONSULTATION,
            link=f"/records"
        )

    await db.commit()
    await db.refresh(consultation)
    return consultation
