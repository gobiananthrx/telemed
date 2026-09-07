from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload

from app.database import get_async_db
from app.models.feedback import Feedback
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import DoctorProfile
from app.models.user import User, UserRole
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.api.deps import get_current_verified_user

router = APIRouter(prefix="/feedback", tags=["Feedback"])

@router.post("", response_model=FeedbackResponse)
async def submit_feedback(
    payload: FeedbackCreate,
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_async_db)
):
    if current_user.role != UserRole.PATIENT or not current_user.patient_profile:
        raise HTTPException(status_code=403, detail="Only patients can submit consultation feedback.")

    patient_id = current_user.patient_profile.id

    # Verify appointment exists and belongs to this patient
    stmt = (
        select(Appointment)
        .options(selectinload(Appointment.consultation))
        .where(Appointment.id == payload.appointment_id)
    )
    res = await db.execute(stmt)
    appointment = res.scalar_one_or_none()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appointment.patient_id != patient_id:
        raise HTTPException(status_code=403, detail="You are not authorized to review this appointment")

    # RULE: Only allow feedback for COMPLETED consultations/appointments
    if appointment.status != AppointmentStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Feedback can only be submitted for completed consultations."
        )

    # Check if already reviewed
    existing_stmt = select(Feedback).where(Feedback.appointment_id == payload.appointment_id)
    existing_fb = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing_fb:
        raise HTTPException(status_code=400, detail="You have already submitted feedback for this consultation.")

    consultation_id = appointment.consultation.id if appointment.consultation else None

    feedback = Feedback(
        appointment_id=appointment.id,
        consultation_id=consultation_id,
        patient_id=patient_id,
        doctor_id=appointment.doctor_id,
        rating=payload.rating,
        tags=payload.tags,
        comment=payload.comment
    )
    db.add(feedback)

    # Update doctor's aggregate rating and reviews count
    doc_stmt = select(DoctorProfile).where(DoctorProfile.id == appointment.doctor_id)
    doctor = (await db.execute(doc_stmt)).scalar_one_or_none()
    if doctor:
        doctor.reviews_count += 1
        # Recalculate average
        avg_stmt = select(func.avg(Feedback.rating)).where(Feedback.doctor_id == doctor.id)
        avg_res = await db.execute(avg_stmt)
        avg_rating = avg_res.scalar() or payload.rating
        doctor.rating = round(float(avg_rating), 1)

    await db.commit()

    # Reload with relationships
    fb_stmt = select(Feedback).options(selectinload(Feedback.patient)).where(Feedback.id == feedback.id)
    return (await db.execute(fb_stmt)).scalar_one()

@router.get("/doctor/{doctor_id}", response_model=List[FeedbackResponse])
async def get_doctor_feedback(
    doctor_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    stmt = (
        select(Feedback)
        .options(selectinload(Feedback.patient))
        .where(Feedback.doctor_id == doctor_id)
        .order_by(desc(Feedback.created_at))
    )
    res = await db.execute(stmt)
    return res.scalars().all()
