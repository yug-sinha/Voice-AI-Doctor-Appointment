import logging
import json
import base64
from typing import Dict, Any
import asyncio

from mock_db import get_all_doctors

def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    return logging.getLogger(__name__)

def encode_audio_to_base64(audio_data: bytes) -> str:
    """Encode audio data to base64 string"""
    return base64.b64encode(audio_data).decode('utf-8')

def decode_audio_from_base64(audio_base64: str) -> bytes:
    """Decode base64 string to audio data"""
    return base64.b64decode(audio_base64)

def format_tool_response(tool_name: str, result: Dict[str, Any]) -> str:
    """Format tool response for natural speech"""
    if result["status"] == "success":
        return result["message"]
    elif result["status"] == "slot_unavailable":
        return result["message"]
    elif result["status"] == "not_found":
        return result["message"]
    else:
        return result.get("message", f"Sorry, there was an error with {tool_name}.")

def _format_doctor_list() -> str:
    """Return formatted bullet list of all doctors."""
    return "\n".join(f"- {doctor}" for doctor in get_all_doctors())


def create_system_prompt() -> str:
    """Create the system prompt for the AI assistant"""
    doctor_list = _format_doctor_list()

    return f"""You are a friendly and professional hospital appointment booking assistant. Your role is to help patients book, confirm, and cancel appointments through natural voice conversation.

Key Guidelines:
1. Always be polite, clear, and helpful
2. Speak naturally as if you're a human receptionist
3. When booking appointments, confirm all details before finalizing
4. If a requested time slot is unavailable, proactively suggest alternatives
5. Keep responses concise but informative
6. Use the available tools to check doctor availability and manage appointments
7. If you can't find a doctor by the exact name mentioned, call `list_doctors`, suggest the closest matches, and invite the caller to clarify
8. Always confirm appointment details after booking: doctor name, date, and time

Available doctors in our system (if a caller mentions someone outside this list, gently suggest the closest match):
{doctor_list}

Remember: You're having a voice conversation, so keep your responses natural and conversational, as if speaking to someone on the phone."""

async def handle_tool_call(tool_name: str, tool_args: Dict[str, Any]) -> Dict[str, Any]:
    """Handle tool calls and return raw tool response"""
    from tools import TOOL_FUNCTIONS
    
    try:
        if tool_name in TOOL_FUNCTIONS:
            result = TOOL_FUNCTIONS[tool_name](**tool_args)
            return result
        else:
            return {
                "status": "error",
                "message": f"Sorry, I don't know how to {tool_name}."
            }
    except Exception as e:
        logging.error(f"Tool call error for {tool_name}: {e}")
        return {
            "status": "error",
            "message": f"Sorry, I encountered an error while trying to {tool_name}. Please try again."
        }

def validate_audio_format(audio_data: bytes) -> bool:
    """Basic validation for audio data"""
    # Basic check - audio data should not be empty and should be reasonable size
    if not audio_data or len(audio_data) < 100:
        return False
    return True

class SessionManager:
    """Manage conversation sessions and state"""
    
    def __init__(self):
        self.sessions = {}
    
    def create_session(self, session_id: str) -> Dict[str, Any]:
        """Create a new session"""
        self.sessions[session_id] = {
            "created_at": asyncio.get_event_loop().time(),
            "last_activity": asyncio.get_event_loop().time(),
            "context": {},
            "conversation_history": []
        }
        return self.sessions[session_id]
    
    def get_session(self, session_id: str) -> Dict[str, Any]:
        """Get session or create if not exists"""
        if session_id not in self.sessions:
            return self.create_session(session_id)
        
        self.sessions[session_id]["last_activity"] = asyncio.get_event_loop().time()
        return self.sessions[session_id]
    
    def update_session_context(self, session_id: str, context: Dict[str, Any]):
        """Update session context"""
        session = self.get_session(session_id)
        session["context"].update(context)
    
    def cleanup_old_sessions(self, max_age_seconds: int = 3600):
        """Clean up sessions older than max_age_seconds"""
        current_time = asyncio.get_event_loop().time()
        expired_sessions = [
            sid for sid, session in self.sessions.items()
            if current_time - session["last_activity"] > max_age_seconds
        ]
        
        for sid in expired_sessions:
            del self.sessions[sid]
        
        return len(expired_sessions)
