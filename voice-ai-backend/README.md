# Voice AI Hospital Assistant - Backend

A FastAPI backend service that provides voice-based hospital appointment booking using Google Gemini's Realtime Audio API.

## Features

- Real-time voice conversation via WebSocket
- Integration with Google Gemini 2.0 Flash for natural language processing
- Hospital appointment management (book, cancel, check availability)
- Mock database with sample doctors and appointments
- Tool calling for appointment operations
- CORS configuration for frontend integration

## Setup

### Prerequisites

- Python 3.8+
- Google Gemini API key

### Installation

1. Clone the repository and navigate to the backend folder:
```bash
cd voice-ai-backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:
```
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### Running Locally

```bash
python main.py
```

The server will start on `http://localhost:8000`

### API Endpoints

- `GET /` - Health check
- `GET /doctors` - List available doctors
- `GET /health` - Detailed health status
- `WebSocket /voice` - Voice conversation endpoint

### Available Doctors (Mock Data)

- **Dr. John Smith** - Cardiology
- **Dr. Sarah Lee** - Dermatology  
- **Dr. Michael Johnson** - Orthopedics

Each doctor has pre-configured available time slots for November 9-10, 2025.

## Deployment on Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the build command: `pip install -r requirements.txt`
4. Set the start command: `python main.py`
5. Add environment variable: `GEMINI_API_KEY`
6. Deploy

## Project Structure

```
voice-ai-backend/
├── main.py              # FastAPI app with WebSocket + Gemini integration
├── tools.py             # Appointment booking/cancellation logic
├── mock_db.py           # Mock database with doctors and appointments
├── utils.py             # Helper functions and session management
├── requirements.txt     # Python dependencies
├── render.yaml          # Render deployment configuration
├── .env.example         # Environment variables template
└── README.md           # This file
```

## Tool Functions

The assistant can perform these operations:

1. **list_doctors()** - Get all available doctors
2. **get_available_slots(doctor_name)** - Check doctor availability
3. **book_appointment(doctor_name, date, time, patient_name)** - Book an appointment
4. **cancel_appointment(doctor_name, date, time, patient_name)** - Cancel an appointment

## WebSocket Protocol

The `/voice` endpoint accepts:
- Binary audio data (PCM format recommended)
- Streams audio to/from Gemini Live API
- Handles tool calls automatically
- Returns audio responses

## Error Handling

- Graceful handling of WebSocket disconnections
- Tool call error recovery
- Validation for audio data
- Comprehensive logging

## Future Enhancements

- Integration with real hospital APIs
- Patient authentication
- Appointment reminders
- Multi-language support
- Voice customization
