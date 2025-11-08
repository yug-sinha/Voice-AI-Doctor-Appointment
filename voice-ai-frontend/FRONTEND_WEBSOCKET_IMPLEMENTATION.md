# Frontend WebSocket API Implementation

This document describes how the frontend implements the WebSocket API contract for real-time voice communication with the backend.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [WebSocket Connection](#websocket-connection)
3. [Message Types](#message-types)
4. [Audio Handling](#audio-handling)
5. [Component Structure](#component-structure)
6. [Hooks and Utilities](#hooks-and-utilities)
7. [Integration Flow](#integration-flow)
8. [Configuration](#configuration)

---

## Architecture Overview

The frontend uses a WebSocket connection to communicate with the backend, streaming audio and receiving responses in real-time.

```
┌─────────────────┐         WebSocket          ┌─────────────────┐
│   Frontend      │ ◄─────────────────────────► │    Backend      │
│                 │                             │                 │
│  - Audio Input  │ ────── Binary Chunks ──────► │  - Gemini API   │
│  - Text Input   │ ────── JSON Messages ──────► │  - Processing   │
│                 │                             │                 │
│  - Audio Output │ ◄───── PCM16 Chunks ─────── │  - Audio Stream │
│  - Transcripts  │ ◄───── JSON Messages ────── │  - Transcripts  │
└─────────────────┘                             └─────────────────┘
```

---

## WebSocket Connection

### Connection Setup

**Location:** `src/hooks/useWebSocket.ts`

The WebSocket connection is established with the following configuration:

```typescript
const ws = new WebSocket(wsUrl)
ws.binaryType = 'arraybuffer'  // Required for PCM16 audio chunks
```

### Connection URL

The WebSocket URL is built from:
1. `backendUrl` prop (if provided)
2. `NEXT_PUBLIC_BACKEND_URL` environment variable
3. Default: `ws://localhost:8000`

**Final URL:** `ws://localhost:8000/voice` (or `wss://` for HTTPS)

**Implementation:** `src/utils/websocket.ts`

```typescript
export const buildWebSocketUrl = (backendUrl?: string): string => {
  const url = backendUrl || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL
  return url.replace('http://', 'ws://').replace('https://', 'wss://') + '/voice'
}
```

### Connection States

The frontend tracks connection states:
- `disconnected` - Not connected
- `connecting` - Connection in progress
- `connected` - Successfully connected
- `error` - Connection error occurred

---

## Message Types

### Messages Sent to Backend

#### 1. Audio Chunks (Binary)

**Format:** Binary data (Blob or ArrayBuffer)

**When:** Continuously while user is speaking

**Implementation:**
```typescript
// Audio chunks are sent as Blob from MediaRecorder
// Backend accepts WebM/Opus or PCM16
send(audioChunk)  // Blob from MediaRecorder
```

**Location:** `src/hooks/useAudioRecording.ts`

**Audio Configuration:**
- Sample Rate: 16 kHz
- Format: WebM/Opus (MediaRecorder default)
- Chunk Interval: 100ms
- Channels: Mono

#### 2. Text Messages (JSON) - Optional

**Format:**
```json
{
  "type": "text",
  "message": "User's text input"
}
```

**When:** When user types a text message (if text input is implemented)

**Implementation:** `src/utils/messageSender.ts`

---

### Messages Received from Backend

#### 1. Audio Format (JSON)

**Format:**
```json
{
  "type": "audio_format",
  "encoding": "pcm16",
  "sample_rate": 24000,
  "channels": 1
}
```

**When:** First message before audio stream starts

**Handling:**
```typescript
if (data.type === 'audio_format') {
  setAudioFormat({
    encoding: data.encoding || 'pcm16',
    sample_rate: data.sample_rate || 24000,
    channels: data.channels || 1,
  })
}
```

**Location:** `src/components/VoiceAssistant.tsx` (line 78-84)

#### 2. Audio Stream (Binary)

**Format:** PCM16 little-endian at 24 kHz, mono

**When:** Continuously during AI response

**Handling:**
```typescript
if (event.data instanceof ArrayBuffer) {
  // Convert to Int16Array and play
  const pcm16Data = new Int16Array(event.data)
  await playPCM16Chunk(event.data)
}
```

**Location:** `src/hooks/useAudioPlayback.ts`

#### 3. Transcripts (JSON)

**Format:**
```json
{
  "type": "transcript",
  "message": "AI's response text"
}
```

**Alternative format (backend also accepts `content`):**
```json
{
  "type": "transcript",
  "content": "AI's response text"
}
```

**When:** When AI generates a text response

**Handling:**
```typescript
if (data.type === 'transcript' && (data.message || data.content)) {
  const transcriptText = data.message || data.content || ''
  addMessage('assistant', transcriptText)
  // Also speak using TTS
  speakText(transcriptText)
}
```

**Location:** `src/components/VoiceAssistant.tsx` (line 87-106)

#### 4. Errors (JSON)

**Format:**
```json
{
  "type": "error",
  "message": "Error description"
}
```

**When:** When an error occurs on the backend

**Handling:**
```typescript
if (data.type === 'error' && (data.message || data.content)) {
  const errorText = data.message || data.content || 'An error occurred'
  addMessage('assistant', errorText)
  speakText(errorText)  // Optional: speak error
}
```

**Location:** `src/components/VoiceAssistant.tsx` (line 109-116)

---

## Audio Handling

### Sending Audio (Microphone → Backend)

**Flow:**
1. User clicks microphone button
2. `useAudioRecording` hook requests microphone access
3. Creates `MediaRecorder` with WebM/Opus encoding
4. Records audio in 100ms chunks
5. Sends each chunk to backend via WebSocket

**Implementation:** `src/hooks/useAudioRecording.ts`

```typescript
const startRecording = async () => {
  const stream = await requestMicrophoneAccess()
  const mediaRecorder = createMediaRecorder(stream)
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      send(event.data)  // Send Blob to backend
    }
  }
  
  mediaRecorder.start(100)  // 100ms chunks
}
```

**Audio Configuration:** `src/constants/index.ts`
```typescript
export const AUDIO_CONFIG = {
  sampleRate: 16000,      // 16 kHz
  channelCount: 1,        // Mono
  echoCancellation: true,
  noiseSuppression: true,
  chunkInterval: 100,     // 100ms chunks
  mimeType: 'audio/webm;codecs=opus',
}
```

### Receiving Audio (Backend → Frontend)

**Flow:**
1. Backend sends `audio_format` message first
2. Frontend configures audio player for 24kHz PCM16
3. Backend streams PCM16 binary chunks
4. Frontend converts PCM16 to Float32 and plays via Web Audio API

**Implementation:** `src/utils/audioPlayback.ts`

**PCM16 Audio Player:**
```typescript
class PCM16AudioPlayer {
  constructor(audioContext: AudioContext, sampleRate: number = 24000)
  
  async addChunk(pcm16Data: Int16Array): Promise<void>
  stop(): void
}
```

**Conversion Process:**
```typescript
// 1. Receive ArrayBuffer
const pcm16Buffer = new Int16Array(arrayBuffer)

// 2. Create AudioBuffer
const audioBuffer = audioContext.createBuffer(1, pcm16Buffer.length, 24000)

// 3. Convert Int16 to Float32 (-1.0 to 1.0)
const channelData = audioBuffer.getChannelData(0)
for (let i = 0; i < pcm16Buffer.length; i++) {
  channelData[i] = pcm16Buffer[i] / 32768.0
}

// 4. Play
const source = audioContext.createBufferSource()
source.buffer = audioBuffer
source.connect(audioContext.destination)
source.start()
```

**Location:** `src/hooks/useAudioPlayback.ts`

---

## Component Structure

### Main Component

**File:** `src/components/VoiceAssistant.tsx`

**Responsibilities:**
- Manages WebSocket connection
- Handles all message types
- Coordinates audio recording and playback
- Manages UI state (listening, speaking, connected)
- Integrates speech recognition and TTS

**Key Hooks Used:**
```typescript
const { ws, isConnected, connect, disconnect, send } = useWebSocket(backendUrl)
const { isListening, startRecording, stopRecording } = useAudioRecording(isConnected, onAudioChunk)
const { isSpeaking, playAudio, playPCM16Chunk, setAudioFormat } = useAudioPlayback()
const { speak: speakText } = useTextToSpeech(true)
```

### Message Flow in Component

```typescript
// 1. Connection
useEffect(() => {
  if (isConnected && messages.length === 0) {
    // Show welcome message
  }
}, [isConnected])

// 2. WebSocket Messages
useEffect(() => {
  const handleMessage = async (event: MessageEvent) => {
    if (event.data instanceof ArrayBuffer) {
      // PCM16 audio chunk
      await playPCM16Chunk(event.data)
    } else {
      // JSON message
      const data = JSON.parse(event.data)
      // Handle audio_format, transcript, error
    }
  }
  ws.addEventListener('message', handleMessage)
}, [ws])
```

---

## Hooks and Utilities

### 1. `useWebSocket`

**File:** `src/hooks/useWebSocket.ts`

**Purpose:** Manages WebSocket connection lifecycle

**API:**
```typescript
const {
  ws,                    // WebSocket instance
  isConnected,           // boolean
  connectionStatus,      // 'disconnected' | 'connecting' | 'connected' | 'error'
  connect,               // () => void
  disconnect,            // () => void
  send,                  // (data: string | Blob | ArrayBuffer) => void
} = useWebSocket(backendUrl)
```

**Features:**
- Sets `binaryType = 'arraybuffer'` for PCM16 support
- Handles connection states
- Provides send function for all data types

### 2. `useAudioRecording`

**File:** `src/hooks/useAudioRecording.ts`

**Purpose:** Handles microphone recording and streaming

**API:**
```typescript
const {
  isListening,           // boolean
  audioLevel,            // number (0-1)
  startRecording,        // () => Promise<void>
  stopRecording,         // () => void
  sendAudioChunk,       // (chunk: Blob) => void
} = useAudioRecording(isConnected, onAudioChunk)
```

**Features:**
- Requests microphone permission
- Creates MediaRecorder with optimal settings
- Sends audio chunks via callback
- Monitors audio levels for UI visualization

### 3. `useAudioPlayback`

**File:** `src/hooks/useAudioPlayback.ts`

**Purpose:** Handles audio playback from backend

**API:**
```typescript
const {
  isSpeaking,            // boolean
  playAudio,             // (audio: Blob | ArrayBuffer) => Promise<void>
  playPCM16Chunk,        // (pcm16Data: ArrayBuffer) => Promise<void>
  setAudioFormat,        // (format: AudioFormat) => void
} = useAudioPlayback()
```

**Features:**
- Handles both PCM16 (ArrayBuffer) and Blob audio
- Queue-based playback for smooth streaming
- Configures audio context based on `audio_format` message

### 4. `useTextToSpeech`

**File:** `src/hooks/useTextToSpeech.ts`

**Purpose:** Converts text transcripts to speech

**API:**
```typescript
const {
  isSpeaking,            // boolean
  speak,                 // (text: string) => Promise<void>
  stop,                  // () => void
  isSupported,           // boolean
} = useTextToSpeech(autoSpeak)
```

**Features:**
- Uses Web Speech Synthesis API
- Automatically speaks transcripts
- Provides fallback if TTS not supported

### 5. `useSpeechRecognition`

**File:** `src/hooks/useSpeechRecognition.ts`

**Purpose:** Real-time speech-to-text for UI display

**API:**
```typescript
const {
  transcript,            // string
  interimTranscript,     // string
  finalTranscript,       // string
  isListening,          // boolean
  startListening,       // () => void
  stopListening,        // () => void
  error,                // string | null
  isSupported,          // boolean
} = useSpeechRecognition(onResult)
```

**Features:**
- Uses Web Speech API for client-side STT
- Shows real-time transcription in UI
- Falls back to server transcription if unavailable

### Utilities

#### `buildWebSocketUrl`

**File:** `src/utils/websocket.ts`

Builds WebSocket URL from backend URL, handling HTTP/HTTPS to WS/WSS conversion.

#### `PCM16AudioPlayer`

**File:** `src/utils/audioPlayback.ts`

Queue-based audio player for streaming PCM16 chunks at 24kHz.

#### `sendTextMessage`

**File:** `src/utils/messageSender.ts`

Utility to send text messages in the correct format.

---

## Integration Flow

### Complete User Interaction Flow

```
1. User clicks "Connect"
   └─> useWebSocket.connect()
       └─> WebSocket connects to ws://localhost:8000/voice
           └─> Backend sends welcome message (audio + transcript)

2. User clicks "Tap to Speak"
   └─> useAudioRecording.startRecording()
       ├─> Requests microphone access
       ├─> Creates MediaRecorder
       ├─> Starts recording (100ms chunks)
       └─> Sends audio chunks to backend
           └─> Backend processes with Gemini
               └─> Backend sends response:
                   ├─> audio_format message (first)
                   ├─> PCM16 audio chunks (streaming)
                   └─> transcript message (text)

3. Frontend receives response
   ├─> audio_format → setAudioFormat() → configures player
   ├─> PCM16 chunks → playPCM16Chunk() → plays audio
   └─> transcript → addMessage() + speakText() → displays and speaks

4. User clicks "Stop Recording"
   └─> useAudioRecording.stopRecording()
       └─> Stops MediaRecorder and sends final chunk
```

### Message Sequence Diagram

```
Frontend                    Backend
   |                          |
   |─── Connect ──────────────>|
   |                          |
   |<── Welcome (audio) ──────|
   |<── Welcome (transcript) ──|
   |                          |
   |─── Audio Chunk 1 ────────>|
   |─── Audio Chunk 2 ────────>|
   |─── Audio Chunk 3 ────────>|
   |                          |
   |<── audio_format ─────────|
   |<── PCM16 Chunk 1 ────────|
   |<── PCM16 Chunk 2 ────────|
   |<── transcript ───────────|
   |                          |
```

---

## Configuration

### Environment Variables

Create `.env.local` in project root:

```env
NEXT_PUBLIC_BACKEND_URL=ws://localhost:8000
```

Or for production:

```env
NEXT_PUBLIC_BACKEND_URL=wss://your-backend-domain.com
```

### Default Configuration

**File:** `src/constants/index.ts`

```typescript
export const DEFAULT_BACKEND_URL = 'ws://localhost:8000'

export const AUDIO_CONFIG = {
  sampleRate: 16000,        // Input: 16 kHz
  channelCount: 1,          // Mono
  echoCancellation: true,
  noiseSuppression: true,
  chunkInterval: 100,       // 100ms chunks
  mimeType: 'audio/webm;codecs=opus',
}
```

**Note:** Backend sends audio at 24 kHz (PCM16), which is handled automatically.

### Component Props

```typescript
<VoiceAssistant backendUrl="ws://localhost:8000" />
```

If `backendUrl` prop is not provided, it uses:
1. `NEXT_PUBLIC_BACKEND_URL` environment variable
2. Default: `ws://localhost:8000`

---

## Error Handling

### Connection Errors

- **WebSocket fails to connect:** Shows error status, allows retry
- **Connection drops:** Automatically sets status to `disconnected`
- **Backend error message:** Displays error in UI and optionally speaks it

### Audio Errors

- **Microphone access denied:** Shows error, disables recording
- **Audio playback fails:** Logs error, continues with other messages
- **PCM16 decode error:** Falls back to Blob playback if available

### Fallbacks

- **Speech Recognition unavailable:** Falls back to server transcription
- **TTS unavailable:** Only displays transcripts (no speech)
- **Audio format not received:** Uses default 24kHz PCM16

---

## Testing

### Local Development

1. Start backend: `uvicorn main:app --reload` (port 8000)
2. Start frontend: `npm run dev` (port 3000)
3. Open browser: `http://localhost:3000`
4. Click "Connect" → Should connect to `ws://localhost:8000/voice`

### WebSocket Testing

Check browser console for:
- `WebSocket connected successfully!`
- `Received audio format: {...}`
- `Received PCM16 audio chunk, size: X bytes`
- `Received transcript: {...}`

### Network Tab

In browser DevTools → Network → WS:
- Should see connection to `/voice`
- Messages tab shows JSON messages
- Binary messages show as "binary" type

---

## Browser Compatibility

### Required APIs

- **WebSocket API** - All modern browsers ✅
- **MediaRecorder API** - Chrome, Edge, Firefox, Safari ✅
- **Web Audio API** - All modern browsers ✅
- **Web Speech API** - Chrome, Edge, Safari (with webkit prefix) ⚠️
- **Speech Synthesis API** - All modern browsers ✅

### Known Limitations

- **Firefox:** Speech Recognition not supported (falls back to server STT)
- **Safari:** Requires `webkitSpeechRecognition` prefix
- **Mobile:** May require HTTPS for microphone access

---

## Troubleshooting

### Connection Issues

**Problem:** WebSocket fails to connect

**Solutions:**
1. Check backend is running on port 8000
2. Verify `NEXT_PUBLIC_BACKEND_URL` is correct
3. Check browser console for CORS/connection errors
4. Ensure backend WebSocket endpoint is `/voice`

### Audio Issues

**Problem:** No audio playback

**Solutions:**
1. Check browser console for audio format message
2. Verify `audio_format` message received before audio chunks
3. Check Web Audio API is supported
4. Ensure audio context is created with correct sample rate (24kHz)

**Problem:** Audio stuttering

**Solutions:**
1. Reduce chunk size (currently 100ms)
2. Increase buffer size in `PCM16AudioPlayer`
3. Check network latency

### Microphone Issues

**Problem:** Microphone not working

**Solutions:**
1. Check browser permissions (Settings → Privacy → Microphone)
2. Verify HTTPS (required on some browsers)
3. Check `getUserMedia` errors in console
4. Try different browser

---

## Summary

The frontend implements a complete WebSocket-based voice communication system:

✅ **Connection:** WebSocket with `arraybuffer` binary type  
✅ **Audio Input:** MediaRecorder → WebM/Opus → Backend  
✅ **Audio Output:** PCM16 (24kHz) → Web Audio API  
✅ **Messages:** JSON for transcripts, errors, and audio format  
✅ **Real-time:** Streaming audio chunks (100ms intervals)  
✅ **Fallbacks:** Server STT, TTS, error handling  

All implementation follows the backend WebSocket contract as specified in `frontend_integration.md`.

