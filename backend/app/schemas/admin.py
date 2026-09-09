from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.schemas.user import DoctorProfileResponse, PatientProfileResponse
from app.schemas.appointment import AppointmentResponse

from datetime import datetime

class DoctorCreateByAdmin(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    qualification: str
    specialty: str
    experience_years: int
    hospital_name: str = "Apollo Telemed Speciality Hospital"
    consultation_fee: float = 500.0
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class AdminPatientResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    uhid: str
    city: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PlatformStatsResponse(BaseModel):
    total_patients: int
    total_doctors: int
    total_appointments: int
    completed_consultations: int
    total_prescriptions: int
    recent_appointments: List[AppointmentResponse] = []
