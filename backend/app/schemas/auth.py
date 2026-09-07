from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from app.models.user import UserRole, OTPPurpose

class PatientRegister(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    city: str
    blood_group: str
    password: str
    confirm_password: Optional[str] = None

    @field_validator("blood_group")
    def validate_blood_group(cls, v):
        valid = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
        if v.upper() not in valid:
            raise ValueError(f"Blood group must be one of {valid}")
        return v.upper()

    @field_validator("password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str
    purpose: OTPPurpose = OTPPurpose.REGISTRATION

class ResendOTPRequest(BaseModel):
    email: EmailStr
    purpose: OTPPurpose = OTPPurpose.REGISTRATION

class LoginRequest(BaseModel):
    identifier: str # email or username or phone
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    email: str
    name: str
    uhid: Optional[str] = None
    doctor_id: Optional[int] = None
    patient_id: Optional[int] = None
