from sqlalchemy import Column, Integer, String, Date, Time, Float, ForeignKey, DateTime, Enum as SAEnum, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.database import Base

class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    CONFIRMED = "CONFIRMED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    MISSED = "MISSED"
    CANCELLED = "CANCELLED"

class ConsultationMode(str, enum.Enum):
    VIDEO = "VIDEO"

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    appointment_number = Column(String, unique=True, index=True, nullable=False) # e.g. #TLM-BOK-9428
    patient_id = Column(Integer, ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    slot_id = Column(Integer, ForeignKey("doctor_slots.id", ondelete="SET NULL"), nullable=True)
    date = Column(Date, index=True, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    status = Column(SAEnum(AppointmentStatus, name="appointment_statuses"), default=AppointmentStatus.CONFIRMED, nullable=False)
    consultation_mode = Column(SAEnum(ConsultationMode, name="consultation_modes"), default=ConsultationMode.VIDEO, nullable=False)
    reason = Column(Text, nullable=True)
    fee = Column(Float, default=500.0, nullable=False)
    payment_status = Column(String, default="PAID", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    patient = relationship("PatientProfile", back_populates="appointments")
    doctor = relationship("DoctorProfile", back_populates="appointments")
    slot = relationship("DoctorSlot")
    consultation = relationship("Consultation", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
    prescription = relationship("Prescription", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
    medical_record = relationship("MedicalRecord", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
