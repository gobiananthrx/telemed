from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.schemas.user import PatientProfileResponse

class FeedbackCreate(BaseModel):
    appointment_id: int
    rating: int = Field(..., ge=1, le=5) # 1 to 5
    tags: Optional[str] = None # e.g. "Detailed Explanation,Polite,Helpful"
    comment: Optional[str] = None

class FeedbackResponse(BaseModel):
    id: int
    appointment_id: int
    consultation_id: Optional[int] = None
    patient_id: int
    doctor_id: int
    rating: int
    tags: Optional[str] = None
    comment: Optional[str] = None
    created_at: datetime
    patient: Optional[PatientProfileResponse] = None

    class Config:
        from_attributes = True
