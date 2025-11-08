# Frontend Integration Guide

Build a browser (or native) client that can talk to the Voice AI backend’s WebSocket interface while streaming microphone audio to Google Gemini and playing the responses in real time.

## Architecture at a Glance

```
Microphone → Frontend encoder → WS text/audio frames
             ↑                                  ↓
  Web UI  ← transcripts + PCM16 audio  ← Backend (/voice)
```

The backend proxies both text and audio to the Gemini Realtime API, executes appointment tools when asked, and streams the model’s spoken replies back as PCM16 audio.

---

## HTTP APIs

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/` | GET | Basic health ping | `{ "message": "...", "status": "healthy" }` |
| `/doctors` | GET | Available doctors list | `{ "doctors": ["Dr. John Smith", ...] }` |
| `/health` | GET | Detailed health info | `{ "status": "healthy", "gemini_configured": true, "active_sessions": 0, "model": "gemini-2.5-flash-native-audio-preview-09-2025" }` |

Use the HTTP endpoints for dashboards or preloading doctor data; the real-time interaction uses the `/voice` WebSocket described next.

---

## `/voice` WebSocket Contract

### Connection

```
const ws = new WebSocket("wss://<backend-host>/voice");
ws.binaryType = "arraybuffer";
```

No auth headers are required unless you layer your own middleware. Once connected, the backend greets the user automatically; the frontend should be ready to render incoming transcripts/audio immediately.

### Messages the Frontend Sends

1. **Text turns (JSON string frame)**

   ```json
   {"type":"text","message":"Hi, I'd like to book Dr. Lee tomorrow morning."}
   ```

   The server also accepts `content` instead of `message`. Send one JSON string per user utterance; the backend forwards it to Gemini as a single turn.

2. **Audio chunks (binary frame)**

   - Sample rate: ideally 16 kHz.
   - Encoding: little-endian PCM16 or WebM/Opus chunk. The backend normalizes via `soundfile/librosa`, but PCM16 yields the lowest latency.
   - Chunk size: 20–100 ms (320–1600 samples) keeps latency low.

   **Browser example (MediaRecorder + PCM16):**

   ```ts
   const ctx = new AudioContext({ sampleRate: 16000 });
   const processor = ctx.createScriptProcessor(4096, 1, 1);

   processor.onaudioprocess = ({ inputBuffer }) => {
     const samples = inputBuffer.getChannelData(0);
     const pcm = new Int16Array(samples.length);
     for (let i = 0; i < samples.length; i++) {
       pcm[i] = Math.max(-1, Math.min(1, samples[i])) * 0x7fff;
     }
     ws.send(pcm.buffer);
   };
   ```

3. **Control**

   At the moment there is no custom control message set; send a standard WebSocket close when done.

### Messages the Frontend Receives

1. **`audio_format` (JSON)**

   First time the backend is about to stream audio, it emits:

   ```json
   {
     "type": "audio_format",
     "encoding": "pcm16",
     "sample_rate": 24000,
     "channels": 1
   }
   ```

   Configure your audio player (e.g., Web Audio `AudioWorklet`) to expect 24 kHz mono PCM16 chunks.

2. **Audio stream (binary frames)**

   Each binary frame is raw PCM16 little-endian sampled at 24 kHz. Pipe into a Web Audio `AudioBuffer` and schedule playback. If you prefer WAV containers, wrap the PCM client-side or request the backend to store via `pcm16_to_wav_bytes`.

3. **Transcripts (JSON)**

   ```json
   {"type":"transcript","message":"Sure! Which doctor would you like to see?"}
   ```

   Display this in the UI while the audio plays for accessibility/chat history.

4. **Errors (JSON)**

   ```json
   {"type":"error","message":"Received audio in an unsupported format."}
   ```

   Show the message and stop streaming; the backend already logged the issue.

### Session Lifecycle

1. Frontend opens WebSocket.
2. Backend accepts, creates a Gemini session, and sends an initial greeting (audio+text).
3. Frontend streams either text JSON or binary audio chunks.
4. Backend forwards content to Gemini, invokes hospital tools as needed, and streams back audio/text.
5. On disconnect, backend tears down the Gemini session. Reconnect with a fresh WebSocket for new conversations.

---

## Recommended Frontend Components

1. **Connection Manager**
   - Handles connect/reconnect, exponential backoff, and clean shutdown.
   - Sets `binaryType = "arraybuffer"`.

2. **Microphone Pipeline**
   - `MediaDevices.getUserMedia({ audio: true })`
   - Downsample to 16 kHz, convert to PCM16, send fixed-size chunks.

3. **Player Pipeline**
   - Create a queue for incoming PCM frames.
   - Use `AudioWorklet`/`ScriptProcessor` to feed a ring buffer at 24 kHz.

4. **Transcript/Chat UI**
   - Append entries from outgoing text messages and incoming `transcript` events.
   - Display tool-call side effects (e.g., appointment confirmations) as part of the transcript.

5. **Error & State Handling**
   - Show toast/banner when an `error` message arrives.
   - Disable microphone UI when the socket closes; allow the user to retry.

---

## Tool Call Awareness (Optional UI Enhancements)

Gemini may ask the backend to list doctors, check availability, or book/cancel appointments. While the backend handles execution, you may surface results by watching transcript messages that describe the outcome (e.g., “Perfect! I’ve booked your appointment…”). No extra frontend plumbing is required, but you can highlight these turns in the chat UI.

---

## Testing Tips

1. **Local server**
   ```
   uvicorn main:app --reload
   ```

2. **Sanity check WebSocket**
   - Use `test_websocket.py` for text-only conversations.
   - For audio, use the provided 16 kHz WAV sample and stream it chunk-by-chunk.

3. **Frontend dev server**
   - Proxy `/voice` to `ws://localhost:8000/voice` (e.g., Vite devServer proxy).
   - Remember to allow mixed content if testing from `http://localhost`.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Immediate `error` message about audio format | Browser sending MP3/Opus without WebM headers | Convert to PCM16 chunks or send WebM data that libs `soundfile` can parse |
| Audio stutters | Chunk size too large or playback buffer too small | Send smaller frames (<=100 ms) and buffer at least 200 ms client-side |
| No transcript but audio plays | Backend sent only audio parts | Add optional speech-to-text on the frontend if transcripts are required; otherwise rely on JSON messages |
| WebSocket closes instantly | Backend missing `GEMINI_API_KEY` or cannot reach Gemini | Check server logs/`/health` endpoint |

---

With this contract in place, frontend developers can build a responsive, voice-driven UI that streams microphone audio to Gemini via the backend and plays back the AI’s responses with minimal latency. Reach out to the backend team if you need additional message types or authentication hooks. 
