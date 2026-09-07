from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Text, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.database import Base

class MealTiming(str, enum.Enum):
    BEFORE_FOOD = "Before Food"
    AFTER_FOOD = "After Food"
    WITH_FOOD = "With Food"
    ANYTIME = "Anytime"

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    rx_number = Column(String, unique=True, index=True, nullable=False) # e.g. #MED-89420-TX
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False)
    consultation_id = Column(Integer, ForeignKey("consultations.id", ondelete="CASCADE"), unique=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    diagnosis = Column(String, nullable=False) # e.g. Acute Bronchitis / Hypertension Stage 1
    notes = Column(Text, nullable=True)
    follow_up_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    patient = relationship("PatientProfile", back_populates="prescriptions")
    doctor = relationship("DoctorProfile", back_populates="prescriptions")
    appointment = relationship("Appointment", back_populates="prescription")
    consultation = relationship("Consultation", back_populates="prescription")
    medicines = relationship("PrescriptionMedicine", back_populates="prescription", cascade="all, delete-orphan")

class PrescriptionMedicine(Base):
    __tablename__ = "prescription_medicines"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False)
    medicine_name = Column(String, nullable=False) # e.g. Amoxicillin 500mg
    dosage = Column(String, nullable=False) # e.g. 1 Tablet
    frequency = Column(String, nullable=False) # e.g. Twice a day (1-0-1)
    duration = Column(String, nullable=False) # e.g. 5 Days
    timing = Column(SAEnum(MealTiming, name="meal_timings"), default=MealTiming.AFTER_FOOD, nullable=False)
    instructions = Column(Text, nullable=True) # e.g. Drink plenty of warm water

    prescription = relationship("Prescription", back_populates="medicines")
