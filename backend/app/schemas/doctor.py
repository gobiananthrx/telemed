from pydantic import BaseModel
from typing import List, Optional
from datetime import time

class AvailabilitySlot(BaseModel):
    id: Optional[int] = None
    time: str # "10:30"
    end_time: Optional[str] = None
    formatted_time: str # "10:30 AM"
    is_available: bool
    period: str # "Morning", "Afternoon", "Evening"

class DaySlotsResponse(BaseModel):
    date: str # "2026-09-12"
    day_name: str # "Saturday"
    slots: List[AvailabilitySlot]

class DoctorSlotCreate(BaseModel):
    date: str # "2026-09-12"
    start_time: str # "09:00"
    end_time: str # "09:30"

class DoctorSlotBatchCreate(BaseModel):
    date: str # "2026-09-12"
    start_time: str # "09:00"
    end_time: Optional[str] = None # "17:00" or calculated dynamically
    slot_duration_minutes: int = 30
    duration_minutes: Optional[int] = None

class DoctorSlotResponse(BaseModel):
    id: int
    doctor_id: int
    date: str
    start_time: str
    end_time: str
    is_available: bool

    class Config:
        from_attributes = True

class DoctorAvailabilityCreate(BaseModel):
    day_of_week: int # 0 to 6
    start_time: str # "09:00"
    end_time: str # "17:00"
    slot_duration_minutes: int = 30
    is_active: bool = True

class DoctorAvailabilityResponse(BaseModel):
    id: int
    day_of_week: int
    start_time: time
    end_time: time
    slot_duration_minutes: int
    is_active: bool

    class Config:
        from_attributes = True

