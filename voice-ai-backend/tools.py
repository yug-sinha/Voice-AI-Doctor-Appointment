from typing import List, Dict, Any
import logging
from google.genai import types
from mock_db import (
    get_all_doctors,
    get_doctor_by_name,
    is_slot_available,
    book_appointment_in_db,
    cancel_appointment_in_db,
    DOCTORS,
)

logger = logging.getLogger(__name__)

def list_doctors() -> Dict[str, Any]:
    """Tool to list all available doctors"""
    try:
        doctors = get_all_doctors()
        return {
            "status": "success",
            "doctors": doctors,
            "message": f"Available doctors: {', '.join(doctors)}"
        }
    except Exception as e:
        logger.error(f"Error listing doctors: {e}")
        return {
            "status": "error",
            "message": "Sorry, I couldn't retrieve the doctor list right now."
        }

def get_available_slots(doctor_name: str) -> Dict[str, Any]:
    """Tool to get available slots for a specific doctor"""
    try:
        doctor = get_doctor_by_name(doctor_name)
        if not doctor:
            return {
                "status": "error",
                "message": f"I couldn't find a doctor named {doctor_name}. Available doctors are: {', '.join(get_all_doctors())}"
            }
        
        # Filter out booked slots
        from mock_db import APPOINTMENTS
        available_slots = []
        for slot in doctor["available_slots"]:
            is_booked = any(
                appt["doctor_id"] == doctor["doctor_id"] and
                appt["date"] == slot["date"] and
                appt["time"] == slot["time"]
                for appt in APPOINTMENTS
            )
            if not is_booked:
                available_slots.append(slot)
        
        if not available_slots:
            return {
                "status": "success",
                "slots": [],
                "message": f"Dr. {doctor['name']} has no available slots at the moment."
            }
        
        # Format slots for natural speech
        slot_descriptions = []
        for slot in available_slots:
            slot_descriptions.append(f"{slot['date']} at {slot['time']}")
        
        return {
            "status": "success",
            "doctor": doctor["name"],
            "specialty": doctor["specialty"],
            "slots": available_slots,
            "message": f"Dr. {doctor['name']} ({doctor['specialty']}) is available on: {', '.join(slot_descriptions)}"
        }
    except Exception as e:
        logger.error(f"Error getting available slots: {e}")
        return {
            "status": "error",
            "message": "Sorry, I couldn't check availability right now."
        }

def book_appointment(doctor_name: str, date: str, time: str, patient_name: str = "Patient") -> Dict[str, Any]:
    """Tool to book an appointment"""
    try:
        doctor = get_doctor_by_name(doctor_name)
        if not doctor:
            return {
                "status": "error",
                "message": f"I couldn't find a doctor named {doctor_name}. Available doctors are: {', '.join(get_all_doctors())}"
            }
        
        # Check if slot is available
        if not is_slot_available(doctor["doctor_id"], date, time):
            # Get alternative slots
            available_result = get_available_slots(doctor_name)
            if available_result["status"] == "success" and available_result["slots"]:
                alt_slots = available_result["slots"][:3]  # Show up to 3 alternatives
                alt_descriptions = [f"{slot['date']} at {slot['time']}" for slot in alt_slots]
                return {
                    "status": "slot_unavailable",
                    "message": f"Sorry, Dr. {doctor['name']} is not available on {date} at {time}. How about: {', '.join(alt_descriptions)}?"
                }
            else:
                return {
                    "status": "error",
                    "message": f"Sorry, Dr. {doctor['name']} has no available slots at the moment."
                }
        
        # Book the appointment
        appointment = book_appointment_in_db(
            doctor["doctor_id"], 
            doctor["name"], 
            date, 
            time, 
            patient_name
        )
        
        return {
            "status": "success",
            "appointment": appointment,
            "message": f"Perfect! I've booked your appointment with Dr. {doctor['name']} on {date} at {time}. Your appointment is confirmed."
        }
        
    except Exception as e:
        logger.error(f"Error booking appointment: {e}")
        return {
            "status": "error",
            "message": "Sorry, I couldn't book the appointment right now. Please try again."
        }

def cancel_appointment(doctor_name: str, date: str, time: str, patient_name: str = "Patient") -> Dict[str, Any]:
    """Tool to cancel an appointment"""
    try:
        doctor = get_doctor_by_name(doctor_name)
        if not doctor:
            return {
                "status": "error",
                "message": f"I couldn't find a doctor named {doctor_name}."
            }
        
        # Try to cancel the appointment
        cancelled = cancel_appointment_in_db(doctor["doctor_id"], date, time, patient_name)
        
        if cancelled:
            return {
                "status": "success",
                "message": f"Your appointment with Dr. {doctor['name']} on {date} at {time} has been cancelled successfully."
            }
        else:
            return {
                "status": "not_found",
                "message": f"I couldn't find an appointment with Dr. {doctor['name']} on {date} at {time}. Please check the details."
            }
            
    except Exception as e:
        logger.error(f"Error cancelling appointment: {e}")
        return {
            "status": "error",
            "message": "Sorry, I couldn't cancel the appointment right now. Please try again."
        }

def _schema_string(description: str) -> types.Schema:
    return types.Schema(type="string", description=description)


FUNCTION_DECLARATIONS = [
    types.FunctionDeclaration(
        name="list_doctors",
        description="Get a list of all available doctors in the hospital.",
        parameters=types.Schema(type="object"),
    ),
    types.FunctionDeclaration(
        name="get_available_slots",
        description="Get available appointment slots for a specific doctor.",
        parameters=types.Schema(
            type="object",
            properties={
                "doctor_name": _schema_string(
                    "The name of the doctor to check availability for."
                )
            },
            required=["doctor_name"],
        ),
    ),
    types.FunctionDeclaration(
        name="book_appointment",
        description="Book an appointment with a doctor at a specific date and time.",
        parameters=types.Schema(
            type="object",
            properties={
                "doctor_name": _schema_string("The name of the doctor."),
                "date": _schema_string(
                    "The appointment date in YYYY-MM-DD format."
                ),
                "time": _schema_string(
                    "The appointment time in HH:MM format (24-hour)."
                ),
                "patient_name": _schema_string(
                    "The name of the patient booking the appointment."
                ),
            },
            required=["doctor_name", "date", "time"],
        ),
    ),
    types.FunctionDeclaration(
        name="cancel_appointment",
        description="Cancel an existing appointment.",
        parameters=types.Schema(
            type="object",
            properties={
                "doctor_name": _schema_string("The doctor's name for the appointment."),
                "date": _schema_string(
                    "The appointment date in YYYY-MM-DD format."
                ),
                "time": _schema_string(
                    "The appointment time in HH:MM format (24-hour)."
                ),
                "patient_name": _schema_string(
                    "The patient name on the appointment."
                ),
            },
            required=["doctor_name", "date", "time"],
        ),
    ),
    types.FunctionDeclaration(
        name="end_call",
        description="Politely close the current call once the user has finished.",
        parameters=types.Schema(type="object"),
    ),
]

# Tool definitions for Gemini (single tool with multiple function declarations)
AVAILABLE_TOOLS = [
    types.Tool(function_declarations=FUNCTION_DECLARATIONS)
]

# Tool execution mapping
TOOL_FUNCTIONS = {
    "list_doctors": list_doctors,
    "get_available_slots": get_available_slots,
    "book_appointment": book_appointment,
    "cancel_appointment": cancel_appointment,
    "end_call": lambda: {"status": "success", "message": "Call ended"},
}
