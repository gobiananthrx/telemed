from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.record import RecordType

class MedicalRecordCreate(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    title: str
    record_type: RecordType = RecordType.CONSULTATION_NOTE
    diagnosis: Optional[str] = None
    clinical_notes: str
    attachments: Optional[str] = None

class MedicalRecordResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: Optional[int] = None
    appointment_id: Optional[int] = None
    title: str
    record_type: RecordType
    diagnosis: Optional[str] = None
    clinical_notes: str
    attachments: Optional[str] = None
    created_at: datetime
    doctor_name: Optional[str] = None

    class Config:
        from_attributes = True
