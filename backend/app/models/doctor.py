from sqlalchemy import Column, Integer, String, Float, ForeignKey, Time, Date, Boolean, DateTime, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name = Column(String, nullable=False) # e.g. Dr. Priya Sharma
    qualification = Column(String, nullable=False) # e.g. MBBS, MD, DM
    specialty = Column(String, index=True, nullable=False) # e.g. Cardiologist, General Physician
    experience_years = Column(Integer, default=5, nullable=False)
    hospital_name = Column(String, default="Apollo Telemed Speciality Hospital", nullable=False)
    consultation_fee = Column(Float, default=500.0, nullable=False)
    bio = Column(Text, nullable=True)
    rating = Column(Float, default=5.0, nullable=False)
    reviews_count = Column(Integer, default=0, nullable=False)
    avatar_url = Column(String, nullable=True)
    is_verified = Column(Boolean, default=True, nullable=False)
    city = Column(String, default="Vellore", nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="doctor_profile")
    availabilities = relationship("DoctorAvailability", back_populates="doctor", cascade="all, delete-orphan")
    slots = relationship("DoctorSlot", back_populates="doctor", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="doctor", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="doctor", cascade="all, delete-orphan")

class DoctorAvailability(Base):
    __tablename__ = "doctor_availabilities"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False) # 0 = Monday, 6 = Sunday
    start_time = Column(Time, nullable=False) # e.g. 09:00:00
    end_time = Column(Time, nullable=False) # e.g. 17:00:00
    slot_duration_minutes = Column(Integer, default=30, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    doctor = relationship("DoctorProfile", back_populates="availabilities")

class DoctorSlot(Base):
    __tablename__ = "doctor_slots"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, index=True, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("doctor_id", "date", "start_time", name="uq_doctor_date_start_time"),
    )

    doctor = relationship("DoctorProfile", back_populates="slots")

