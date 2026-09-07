from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Enum as SAEnum, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.database import Base

class NotificationType(str, enum.Enum):
    APPOINTMENT = "APPOINTMENT"
    CONSULTATION = "CONSULTATION"
    PRESCRIPTION = "PRESCRIPTION"
    MEDICAL_RECORD = "MEDICAL_RECORD"
    SYSTEM = "SYSTEM"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(SAEnum(NotificationType, name="notification_types"), default=NotificationType.APPOINTMENT, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    link = Column(String, nullable=True) # e.g. /prescriptions/1 or /consultation/room-123
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notifications")
