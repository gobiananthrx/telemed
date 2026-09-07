from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.database import get_async_db
from app.models.record import MedicalRecord, RecordType
from app.models.patient import PatientProfile
from app.models.doctor import DoctorProfile
from app.models.user import User, UserRole
from app.models.notification import NotificationType
from app.schemas.record import MedicalRecordCreate, MedicalRecordResponse
from app.services.notification_service import create_notification
from app.api.deps import get_current_verified_user, require_roles

router = APIRouter(prefix="/medical-records", tags=["Medical Records"])

@router.post("", response_model=MedicalRecordResponse)
async def create_medical_record(
    payload: MedicalRecordCreate,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    doctor_id = current_user.doctor_profile.id if current_user.doctor_profile else None
    
    record = MedicalRecord(
        patient_id=payload.patient_id,
        doctor_id=doctor_id,
        appointment_id=payload.appointment_id,
        title=payload.title,
        record_type=payload.record_type,
        diagnosis=payload.diagnosis,
        clinical_notes=payload.clinical_notes,
        attachments=payload.attachments
    )
    db.add(record)
    await db.flush()

    # Notify patient
    p_stmt = select(PatientProfile).where(PatientProfile.id == payload.patient_id)
    patient = (await db.execute(p_stmt)).scalar_one_or_none()
    if patient:
        await create_notification(
            db=db,
            user_id=patient.user_id,
            title="New Medical Record Added",
            message=f"A new {payload.record_type.value} has been added to your health records.",
            notification_type=NotificationType.MEDICAL_RECORD,
            link=f"/records"
        )

    await db.commit()
    await db.refresh(record)

    doc_name = current_user.doctor_profile.full_name if current_user.doctor_profile else "Hospital Clinical Team"
    data = MedicalRecordResponse.model_validate(record)
    data.doctor_name = doc_name
    return data

@router.get("", response_model=List[MedicalRecordResponse])
async def list_medical_records(
    patient_id: Optional[int] = None,
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_async_db)
):
    stmt = select(MedicalRecord)

    if current_user.role == UserRole.PATIENT:
        if not current_user.patient_profile:
            return []
        stmt = stmt.where(MedicalRecord.patient_id == current_user.patient_profile.id)
    elif current_user.role == UserRole.DOCTOR:
        if patient_id:
            stmt = stmt.where(MedicalRecord.patient_id == patient_id)
        else:
            stmt = stmt.where(MedicalRecord.doctor_id == current_user.doctor_profile.id)
    elif current_user.role == UserRole.ADMIN:
        if patient_id:
            stmt = stmt.where(MedicalRecord.patient_id == patient_id)

    stmt = stmt.order_by(desc(MedicalRecord.created_at))
    res = await db.execute(stmt)
    records = res.scalars().all()

    result = []
    for r in records:
        data = MedicalRecordResponse.model_validate(r)
        if r.doctor_id:
            doc_stmt = select(DoctorProfile).where(DoctorProfile.id == r.doctor_id)
            doc = (await db.execute(doc_stmt)).scalar_one_or_none()
            if doc:
                data.doctor_name = doc.full_name
        result.append(data)
    return result

@router.get("/{record_id}", response_model=MedicalRecordResponse)
async def get_medical_record(
    record_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_async_db)
):
    stmt = select(MedicalRecord).where(MedicalRecord.id == record_id)
    res = await db.execute(stmt)
    record = res.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")

    if current_user.role == UserRole.PATIENT:
        if not current_user.patient_profile or record.patient_id != current_user.patient_profile.id:
            raise HTTPException(status_code=403, detail="Access denied")

    data = MedicalRecordResponse.model_validate(record)
    if record.doctor_id:
        doc = (await db.execute(select(DoctorProfile).where(DoctorProfile.id == record.doctor_id))).scalar_one_or_none()
        if doc:
            data.doctor_name = doc.full_name
    return data
