import os
import logging
import json
import asyncio
import contextlib
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from utils import (
    setup_logging,
    SessionManager,
    create_system_prompt,
    handle_tool_call,
    format_tool_response,
)
from tools import AVAILABLE_TOOLS
from mock_db import get_all_doctors
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logger = setup_logging()

# Initialize FastAPI app
app = FastAPI(title="Voice AI Hospital Assistant", version="1.0.0")

# Configure CORS
default_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://voice-ai-doctor-appointment.vercel.app",
]

allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    cors_origins = [
        origin.strip()
        for origin in allowed_origins_env.split(",")
        if origin.strip()
    ]
else:
    cors_origins = default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY environment variable not set")
    raise ValueError("GEMINI_API_KEY environment variable is required")

# Initialize the genai client
client = genai.Client(api_key=GEMINI_API_KEY)
MODEL = "gemini-2.5-flash-native-audio-preview-09-2025"
INPUT_SAMPLE_RATE = 16000
OUTPUT_SAMPLE_RATE = 24000
AUDIO_INPUT_MIME_TYPE = f"audio/pcm;rate={INPUT_SAMPLE_RATE}"

# Initialize session manager
session_manager = SessionManager()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Voice AI Hospital Assistant API", "status": "healthy"}

@app.get("/doctors")
async def get_doctors():
    """Get list of available doctors"""
    try:
        doctors = get_all_doctors()
        return {"doctors": doctors}
    except Exception as e:
        logger.error(f"Error getting doctors: {e}")
        raise HTTPException(status_code=500, detail="Failed to get doctors")

@app.websocket("/voice")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for voice conversation"""
    await websocket.accept()
    session_id = f"session_{id(websocket)}"
    session_manager.create_session(session_id)
    logger.info(f"WebSocket connected: {session_id}")
    
    try:
        # Configuration for the live session
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=types.Content(
                role="system",
                parts=[types.Part(text=create_system_prompt())],
            ),
            tools=AVAILABLE_TOOLS,
        )
        
        async with client.aio.live.connect(model=MODEL, config=config) as session:
            logger.info(f"Gemini live session started for {session_id}")

            # Prompt the assistant to greet the caller immediately
            await session.send(
                input=types.LiveClientContent(
                    turns=[
                        types.Content(
                            role="user",
                            parts=[
                                types.Part(
                                    text=(
                                        "The caller just connected to the hospital's voice line. "
                                        "Greet them warmly like a human receptionist and invite them "
                                        "to share how you can help."
                                    )
                                )
                            ],
                        )
                    ],
                    turn_complete=True,
                )
            )
            
            audio_format_sent = False

            async def announce_audio_format_once():
                nonlocal audio_format_sent
                if audio_format_sent:
                    return
                await websocket.send_json(
                    {
                        "type": "audio_format",
                        "encoding": "pcm16",
                        "sample_rate": OUTPUT_SAMPLE_RATE,
                        "channels": 1,
                    }
                )
                audio_format_sent = True

            async def handle_text_payload(raw_text: str):
                try:
                    payload = json.loads(raw_text)
                except json.JSONDecodeError:
                    logger.warning("Received non-JSON text payload from frontend")
                    return

                payload_type = payload.get("type")
                if payload_type == "text":
                    text_content = payload.get("message") or payload.get("content")
                    if not text_content:
                        return

                    await session.send(
                        input=types.LiveClientContent(
                            turns=[
                                types.Content(
                                    role="user",
                                    parts=[types.Part(text=text_content)],
                                )
                            ],
                            turn_complete=True,
                        )
                    )
                elif payload_type == "audio_end":
                    await session.send(
                        input=types.LiveClientRealtimeInput(media_chunks=[]),
                        end_of_turn=True,
                    )
                else:
                    logger.debug(f"Unsupported payload type from frontend: {payload_type}")

            async def forward_tool_responses(
                function_calls: Optional[list[types.FunctionCall]],
            ):
                if not function_calls:
                    return

                for func_call in function_calls:
                    tool_name = func_call.name
                    tool_args = dict(func_call.args) if func_call.args else {}
                    logger.info(f"Tool call requested: {tool_name} with args {tool_args}")

                    tool_result = await handle_tool_call(tool_name, tool_args)
                    spoken_summary = format_tool_response(tool_name, tool_result)

                    response_payload = types.FunctionResponse(
                        id=func_call.id,
                        name=tool_name,
                        response={
                            "output": tool_result,
                            "spoken_summary": spoken_summary,
                        },
                    )

                    try:
                        await websocket.send_json(
                            {
                                "type": "tool_event",
                                "tool": tool_name,
                                "status": tool_result.get("status"),
                                "message": spoken_summary,
                            }
                        )
                    except Exception as send_err:
                        logger.warning(f"Failed to forward tool event: {send_err}")

                    await session.send(
                        input=types.LiveClientToolResponse(
                            function_responses=[response_payload]
                        )
                    )

            async def handle_websocket_messages():
                try:
                    while True:
                        message = await websocket.receive()
                        if message["type"] == "websocket.disconnect":
                            raise WebSocketDisconnect()

                        if message.get("bytes"):
                            audio_chunk = message["bytes"]
                            if audio_chunk:
                                await session.send(
                                    input=types.LiveClientRealtimeInput(
                                        media_chunks=[
                                            types.Blob(
                                                mime_type=AUDIO_INPUT_MIME_TYPE,
                                                data=audio_chunk,
                                            )
                                        ]
                                    )
                                )
                        elif message.get("text"):
                            await handle_text_payload(message["text"])

                except WebSocketDisconnect:
                    logger.info(f"WebSocket disconnected: {session_id}")
                    return
                except Exception as e:
                    logger.error(f"Error handling WebSocket message: {e}")
                    return
            
            async def handle_gemini_responses():
                try:
                    while True:
                        async for response in session.receive():
                            if response.setup_complete:
                                logger.info("Gemini live session setup complete")
                                continue

                            if response.tool_call and response.tool_call.function_calls:
                                await forward_tool_responses(
                                    response.tool_call.function_calls
                                )

                            if response.data:
                                await announce_audio_format_once()
                                await websocket.send_bytes(response.data)

                            text_parts = []
                            if (
                                response.server_content
                                and response.server_content.model_turn
                                and response.server_content.model_turn.parts
                            ):
                                for part in response.server_content.model_turn.parts:
                                    if getattr(part, "thought", False):
                                        continue
                                    if getattr(part, "text", None):
                                        text_parts.append(part.text)

                            if text_parts:
                                combined_text = " ".join(text_parts).strip()
                                if combined_text:
                                    logger.info(
                                        f"Gemini text response: {combined_text}"
                                    )
                                    await websocket.send_json(
                                        {
                                            "type": "transcript",
                                            "message": combined_text,
                                        }
                                    )
                except Exception as e:
                    logger.error(f"Error handling Gemini response: {e}")
            
            # Run both handlers concurrently
            ws_task = asyncio.create_task(handle_websocket_messages())
            gemini_task = asyncio.create_task(handle_gemini_responses())

            done, pending = await asyncio.wait(
                {ws_task, gemini_task}, return_when=asyncio.FIRST_COMPLETED
            )

            for task in pending:
                task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await task

            for task in done:
                task.result()
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {session_id}: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Sorry, there was a connection error: {str(e)}"
            })
        except:
            pass
    finally:
        logger.info(f"Cleaning up session: {session_id}")

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "gemini_configured": bool(GEMINI_API_KEY),
        "active_sessions": len(session_manager.sessions),
        "model": MODEL,
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
