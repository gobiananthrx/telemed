from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.database import Base

class RecordType(str, enum.Enum):
    CONSULTATION_NOTE = "Consultation Note"
    LAB_REPORT = "Lab Report"
    DISCHARGE_SUMMARY = "Discharge Summary"
    DIAGNOSIS = "Diagnosis"

class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False) # e.g. Cardiology Consultation Summary
    record_type = Column(SAEnum(RecordType, name="record_types"), default=RecordType.CONSULTATION_NOTE, nullable=False)
    diagnosis = Column(String, nullable=True)
    clinical_notes = Column(Text, nullable=False)
    attachments = Column(Text, nullable=True) # JSON or URLs
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    patient = relationship("PatientProfile", back_populates="medical_records")
    appointment = relationship("Appointment", back_populates="medical_record")
