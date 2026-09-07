from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime
from app.models.user import UserRole

class PatientProfileResponse(BaseModel):
    id: int
    full_name: str
    phone: Optional[str] = None
    blood_group: Optional[str] = "O+"
    uhid: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "Vellore"

    class Config:
        from_attributes = True

class PatientProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None

class DoctorProfileResponse(BaseModel):
    id: int
    full_name: str
    qualification: str
    specialty: str
    experience_years: int
    hospital_name: str
    consultation_fee: float
    bio: Optional[str] = None
    rating: float
    reviews_count: int
    avatar_url: Optional[str] = None
    is_verified: bool
    city: Optional[str] = "Vellore"

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    email: str
    username: Optional[str] = None
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    patient_profile: Optional[PatientProfileResponse] = None
    doctor_profile: Optional[DoctorProfileResponse] = None

    class Config:
        from_attributes = True
