from app.schemas.auth import (
    PatientRegister, VerifyOTPRequest, ResendOTPRequest, LoginRequest,
    ForgotPasswordRequest, ResetPasswordRequest, TokenResponse
)
from app.schemas.user import (
    UserResponse, PatientProfileResponse, PatientProfileUpdate, DoctorProfileResponse
)
from app.schemas.doctor import (
    AvailabilitySlot, DaySlotsResponse, DoctorAvailabilityCreate, DoctorAvailabilityResponse
)
from app.schemas.appointment import (
    AppointmentCreate, AppointmentStatusUpdate, AppointmentResponse
)
from app.schemas.consultation import (
    ConsultationStart, ConsultationEnd, ConsultationResponse
)
from app.schemas.prescription import (
    MedicineItemCreate, MedicineItemResponse, PrescriptionCreate, PrescriptionResponse
)
from app.schemas.record import (
    MedicalRecordCreate, MedicalRecordResponse
)
from app.schemas.notification import NotificationResponse
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.schemas.admin import DoctorCreateByAdmin, PlatformStatsResponse
