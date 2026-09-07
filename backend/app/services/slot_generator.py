from datetime import date, time, datetime, timedelta
from typing import List
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import DoctorAvailability
from app.schemas.doctor import AvailabilitySlot, DaySlotsResponse

def get_slot_period(t: time) -> str:
    if t.hour < 12:
        return "Morning"
    elif t.hour < 16:
        return "Afternoon"
    else:
        return "Evening"

def generate_doctor_slots(
    target_date: date,
    availabilities: List[DoctorAvailability],
    existing_appointments: List[Appointment]
) -> DaySlotsResponse:
    day_of_week = target_date.weekday() # 0 = Monday, 6 = Sunday
    day_name = target_date.strftime("%A")

    # Find matching availability
    matching_avail = [a for a in availabilities if a.day_of_week == day_of_week and a.is_active]
    
    # Booked times on this date
    booked_times = {
        appt.start_time.strftime("%H:%M")
        for appt in existing_appointments
        if appt.status != AppointmentStatus.CANCELLED
    }

    slots: List[AvailabilitySlot] = []

    if not matching_avail:
        # Default working hours 09:00 to 17:00 Monday to Saturday, 10:00 to 14:00 Sunday
        if day_of_week == 6:
            start_hour, end_hour = 10, 14
        else:
            start_hour, end_hour = 9, 17
        slot_duration = 30
        
        cur = datetime.combine(target_date, time(start_hour, 0))
        end_dt = datetime.combine(target_date, time(end_hour, 0))
        
        while cur < end_dt:
            t = cur.time()
            time_str = t.strftime("%H:%M")
            formatted_time = t.strftime("%I:%M %p").lstrip("0")
            is_booked = time_str in booked_times
            
            slots.append(AvailabilitySlot(
                time=time_str,
                formatted_time=formatted_time,
                is_available=not is_booked,
                period=get_slot_period(t)
            ))
            cur += timedelta(minutes=slot_duration)
    else:
        for avail in matching_avail:
            slot_duration = avail.slot_duration_minutes or 30
            cur = datetime.combine(target_date, avail.start_time)
            end_dt = datetime.combine(target_date, avail.end_time)
            
            while cur < end_dt:
                t = cur.time()
                time_str = t.strftime("%H:%M")
                formatted_time = t.strftime("%I:%M %p").lstrip("0")
                is_booked = time_str in booked_times
                
                slots.append(AvailabilitySlot(
                    time=time_str,
                    formatted_time=formatted_time,
                    is_available=not is_booked,
                    period=get_slot_period(t)
                ))
                cur += timedelta(minutes=slot_duration)

    return DaySlotsResponse(
        date=target_date.isoformat(),
        day_name=day_name,
        slots=slots
    )
