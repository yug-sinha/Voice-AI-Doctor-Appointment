from datetime import datetime, timedelta
from typing import List, Dict, Optional

# Mock database for doctors and appointments
def _slots_for_day(day: str, start: int, end: int, interval_hours: int = 1):
    slots = []
    for hour in range(start, end + 1, interval_hours):
        slots.append({"date": day, "time": f"{hour:02d}:00"})
        slots.append({"date": day, "time": f"{hour:02d}:30"})
    return slots

DOCTORS = {
    "dr_smith": {
        "doctor_id": "dr_smith",
        "name": "Dr. John Smith",
        "specialty": "Cardiology",
        "available_slots": _slots_for_day("2025-11-09", 9, 17)
        + _slots_for_day("2025-11-10", 9, 17)
        + _slots_for_day("2025-11-11", 9, 17),
    },
    "dr_lee": {
        "doctor_id": "dr_lee",
        "name": "Dr. Sarah Lee",
        "specialty": "Dermatology",
        "available_slots": _slots_for_day("2025-11-09", 10, 18, 2)
        + _slots_for_day("2025-11-10", 10, 18, 2)
        + _slots_for_day("2025-11-11", 10, 18, 2),
    },
    "dr_johnson": {
        "doctor_id": "dr_johnson",
        "name": "Dr. Michael Johnson",
        "specialty": "Orthopedics",
        "available_slots": _slots_for_day("2025-11-09", 8, 16)
        + _slots_for_day("2025-11-10", 8, 16)
        + _slots_for_day("2025-11-11", 8, 16),
    },
    "dr_khan": {
        "doctor_id": "dr_khan",
        "name": "Dr. Aisha Khan",
        "specialty": "Pediatrics",
        "available_slots": _slots_for_day("2025-11-09", 9, 15, 2)
        + _slots_for_day("2025-11-10", 9, 15, 2)
        + _slots_for_day("2025-11-11", 9, 15, 2),
    },
    "dr_martinez": {
        "doctor_id": "dr_martinez",
        "name": "Dr. Carlos Martinez",
        "specialty": "Neurology",
        "available_slots": _slots_for_day("2025-11-09", 11, 19)
        + _slots_for_day("2025-11-10", 11, 19)
        + _slots_for_day("2025-11-11", 11, 19),
    },
    "dr_oliver": {
        "doctor_id": "dr_oliver",
        "name": "Dr. Emily Oliver",
        "specialty": "Ophthalmology",
        "available_slots": _slots_for_day("2025-11-09", 10, 14)
        + _slots_for_day("2025-11-10", 10, 14)
        + _slots_for_day("2025-11-11", 10, 14),
    },
    "dr_brown": {
        "doctor_id": "dr_brown",
        "name": "Dr. Marcus Brown",
        "specialty": "General Surgery",
        "available_slots": _slots_for_day("2025-11-09", 7, 12)
        + _slots_for_day("2025-11-10", 7, 12)
        + _slots_for_day("2025-11-11", 7, 12),
    },
    "dr_williams": {
        "doctor_id": "dr_williams",
        "name": "Dr. Priya Williams",
        "specialty": "ENT",
        "available_slots": _slots_for_day("2025-11-09", 12, 20)
        + _slots_for_day("2025-11-10", 12, 20)
        + _slots_for_day("2025-11-11", 12, 20),
    },
}

# In-memory storage for booked appointments
APPOINTMENTS = []

def get_doctor_by_name(doctor_name: str) -> Optional[Dict]:
    """Find doctor by name (case-insensitive partial match)"""
    doctor_name_lower = doctor_name.lower()
    
    for doctor_id, doctor_data in DOCTORS.items():
        if doctor_name_lower in doctor_data["name"].lower():
            return doctor_data
    return None

def get_all_doctors() -> List[str]:
    """Get list of all doctor names"""
    return [doctor["name"] for doctor in DOCTORS.values()]

def is_slot_available(doctor_id: str, date: str, time: str) -> bool:
    """Check if a specific slot is available"""
    if doctor_id not in DOCTORS:
        return False
    
    # Check if slot exists in available slots
    available_slots = DOCTORS[doctor_id]["available_slots"]
    slot_exists = any(
        slot["date"] == date and slot["time"] == time 
        for slot in available_slots
    )
    
    if not slot_exists:
        return False
    
    # Check if slot is already booked
    is_booked = any(
        appt["doctor_id"] == doctor_id and 
        appt["date"] == date and 
        appt["time"] == time
        for appt in APPOINTMENTS
    )
    
    return not is_booked

def book_appointment_in_db(doctor_id: str, doctor_name: str, date: str, time: str, patient_name: str) -> Dict:
    """Book an appointment in the database"""
    appointment = {
        "id": len(APPOINTMENTS) + 1,
        "doctor_id": doctor_id,
        "doctor_name": doctor_name,
        "date": date,
        "time": time,
        "patient_name": patient_name,
        "status": "confirmed",
        "created_at": datetime.now().isoformat()
    }
    
    APPOINTMENTS.append(appointment)
    return appointment

def cancel_appointment_in_db(doctor_id: str, date: str, time: str, patient_name: str) -> bool:
    """Cancel an appointment in the database"""
    for i, appt in enumerate(APPOINTMENTS):
        if (appt["doctor_id"] == doctor_id and 
            appt["date"] == date and 
            appt["time"] == time and 
            appt["patient_name"].lower() == patient_name.lower()):
            APPOINTMENTS.pop(i)
            return True
    return False

def get_patient_appointments(patient_name: str) -> List[Dict]:
    """Get all appointments for a patient"""
    return [
        appt for appt in APPOINTMENTS 
        if appt["patient_name"].lower() == patient_name.lower()
    ]
