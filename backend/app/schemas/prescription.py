from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from app.models.prescription import MealTiming
from app.schemas.user import DoctorProfileResponse, PatientProfileResponse

class MedicineItemCreate(BaseModel):
    medicine_name: str
    dosage: str # e.g. "500mg" or "1 Tablet"
    frequency: str # e.g. "Twice a day (1-0-1)"
    duration: str # e.g. "5 Days"
    timing: MealTiming = MealTiming.AFTER_FOOD
    instructions: Optional[str] = None

class MedicineItemResponse(BaseModel):
    id: int
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    timing: MealTiming
    instructions: Optional[str] = None

    class Config:
        from_attributes = True

class PrescriptionCreate(BaseModel):
    consultation_id: Optional[int] = None
    appointment_id: Optional[int] = None
    patient_id: int
    diagnosis: str
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    medicines: List[MedicineItemCreate]

class PrescriptionResponse(BaseModel):
    id: int
    rx_number: str
    appointment_id: Optional[int] = None
    consultation_id: Optional[int] = None
    patient_id: int
    doctor_id: int
    diagnosis: str
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    created_at: datetime
    medicines: List[MedicineItemResponse] = []
    doctor: Optional[DoctorProfileResponse] = None
    patient: Optional[PatientProfileResponse] = None

    class Config:
        from_attributes = True
