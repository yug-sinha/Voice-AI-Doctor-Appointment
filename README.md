# 🏥 Voice AI Hospital Appointment Assistant

Voice-first appointment concierge that runs entirely in the browser, streams live audio to a FastAPI backend, and uses Google Gemini's Realtime Audio API to talk back like a human receptionist.

## Why This Exists
- Real-time, full-duplex audio conversation powered by Gemini 2.5 Flash
- Mock appointment tools (list availability, book, cancel) with natural confirmations
- Modern Next.js UI that captures microphone audio, replays PCM16 from Gemini, and surfaces transcripts/tool events
- Easy path to deploy as either two services or a single self-contained container

## Architecture
| Component | Location | Responsibilities | Core Tech |
|-----------|----------|------------------|-----------|
| FastAPI backend | `voice-ai-backend/` | Hosts `/voice` WebSocket, streams PCM16 both ways, proxies Gemini Live, executes booking tools, exposes `/doctors` and `/health` | FastAPI, `google-genai`, WebSockets |
| Appointment toolkit | `voice-ai-backend/tools.py`, `mock_db.py`, `utils.py` | Mock DB, availability queries, booking/cancel flows surfaced to Gemini via function calling | In-memory store, typed tool schema |
| Frontend | `voice-ai-frontend/` | Single Next.js page (`src/components/VoiceAssistant.tsx`) with audio capture, playback, WebSocket hooks, and UI widgets | Next.js 14 App Router, TypeScript, Tailwind |

```
Voice-AI-Doctor-Appointment/
├── voice-ai-backend/        # FastAPI + Gemini live session
├── voice-ai-frontend/       # Next.js app router UI
└── README.md                # You are here
```

## Feature Highlights
- 🎙 Bi-directional streaming audio over WebSocket
- 🧠 Gemini tools for listing doctors, checking slots, booking, cancelling, ending calls
- 🩺 Doctor/slot catalog stored in `mock_db.py`
- 🔁 Automatic transcripts, tool-event banners, and optional browser TTS playback
- 🛡 Configurable CORS, health checks, and structured logging

## Prerequisites
- Python 3.10+ (google-genai currently targets 3.10/3.11)
- Node.js 18+ and npm
- Google Gemini API key with Realtime Audio access
- Chromium-based browser with microphone permissions

## Quick Start
```bash
git clone https://github.com/yourusername/Voice-AI-Doctor-Appointment.git
cd Voice-AI-Doctor-Appointment
```

### Backend
```bash
cd voice-ai-backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add GEMINI_API_KEY
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd ../voice-ai-frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_BACKEND_URL=ws://localhost:8000
npm run dev
```

Visit `http://localhost:3000`, click **Start Call**, and speak to the assistant. The frontend streams microphone audio to `ws://localhost:8000/voice` while the backend relays everything to Gemini.

## Environment Variables
| Name | Location | Purpose |
|------|----------|---------|
| `GEMINI_API_KEY` | Backend `.env` / container secret | Authenticates the `google-genai` client |
| `PORT` | Backend | Overrides default `8000` |
| `ALLOWED_ORIGINS` | Backend (optional) | Extra comma-separated origins for CORS |
| `NEXT_PUBLIC_BACKEND_URL` | Frontend `.env.local` | WebSocket URL, e.g. `ws://localhost:8000` (dev) or `wss://voice.example.com` |

## Running Everything Inside One Container
The Next.js UI is client-side only, so we can pre-render it and let FastAPI serve the static bundle next to the `/voice` socket. A multi-stage Docker build keeps the final image lean.

```Dockerfile
# Stage 1 – build the Next.js frontend
FROM node:18-bullseye AS frontend-build
WORKDIR /app/frontend
COPY voice-ai-frontend/package*.json ./
RUN npm ci
COPY voice-ai-frontend/ .
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_BACKEND_URL=wss://voice.example.com
RUN npm run build && npx next export -o out

# Stage 2 – FastAPI backend + static assets
FROM python:3.11-slim AS backend
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY voice-ai-backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY voice-ai-backend/ .
COPY --from=frontend-build /app/frontend/out ./frontend-static
ENV PORT=8000
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

FastAPI can serve the exported files:
```python
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

FRONTEND_DIR = os.getenv("FRONTEND_DIST", "frontend-static")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/app", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
```

Build & run:
```bash
docker build -t voice-ai-assistant .
docker run -p 8000:8000 -e GEMINI_API_KEY=sk-your-key voice-ai-assistant
```

Now the UI loads from `http://localhost:8000` and opens `ws://localhost:8000/voice` without cross-origin hassles. Terminate TLS in front of the container (browsers require HTTPS for microphone input) and pass the real `NEXT_PUBLIC_BACKEND_URL` while building the frontend stage.

## API Overview
- `GET /` – health ping
- `GET /doctors` – list of available mock doctors
- `GET /health` – runtime diagnostics (active sessions, model name)
- `WS /voice` – bi-directional PCM16 stream plus JSON events (`audio_format`, `transcript`, `tool_event`, `error`)

## Troubleshooting
- **Mic blocked** – browsers only open the mic on secure origins; use HTTPS in prod and grant mic permissions.
- **WebSocket handshake fails** – confirm backend CORS (`ALLOWED_ORIGINS`) and that `NEXT_PUBLIC_BACKEND_URL` matches the actual scheme/domain.
- **Gemini tool errors** – backend logging shows every tool call + args; adjust `mock_db.py` or `tools.py` accordingly.

## Roadmap Ideas
- Replace mock DB with PostgreSQL or hospital APIs (FHIR/HL7)
- Patient authentication + appointment history
- Analytics dashboards, alerts, and quality monitoring
- Multi-language voice personas

## License
MIT – see [LICENSE](LICENSE).
