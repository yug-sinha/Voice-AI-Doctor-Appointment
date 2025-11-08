# Real-Time Voice Systems: WebRTC, SIP/RTP, and WebSocket Comparison

## Overview

This document explains the differences between WebRTC, SIP/RTP, and WebSocket for real-time voice communication, and which are native browser APIs vs. npm packages.

## Technology Comparison

### 1. WebSocket (Current Implementation) ✅

**Type**: Native Browser API (no package needed)

**Current Usage**: 
- Native `WebSocket` API
- `MediaRecorder` API for audio capture
- Sends audio chunks as Blob over WebSocket

**Pros**:
- ✅ Simple to implement
- ✅ Works with any backend
- ✅ Good for streaming to server
- ✅ No additional packages needed

**Cons**:
- ❌ Higher latency (server relay)
- ❌ Not peer-to-peer
- ❌ More server bandwidth usage

**When to Use**: 
- Server-side processing (like your AI assistant)
- When you need server control
- Simple streaming scenarios

---

### 2. WebRTC (Peer-to-Peer)

**Type**: Native Browser API (optional helper packages)

**Native APIs**:
- `RTCPeerConnection` - Peer connection management
- `getUserMedia` - Media access (already using this)
- `RTCDataChannel` - Data channel for signaling

**Popular npm Packages** (optional helpers):
```bash
npm install simple-peer          # Simple WebRTC wrapper
npm install peerjs               # PeerJS library
npm install mediasoup-client     # Advanced SFU/MCU support
npm install @aiortc/aiortc       # Python WebRTC (backend)
```

**Pros**:
- ✅ Lower latency (direct peer-to-peer)
- ✅ Better quality
- ✅ Reduced server bandwidth
- ✅ Built-in encryption (DTLS)
- ✅ NAT traversal (ICE/STUN/TURN)

**Cons**:
- ❌ More complex setup
- ❌ Requires signaling server
- ❌ May need STUN/TURN servers
- ❌ Firewall/NAT issues

**When to Use**:
- Direct peer-to-peer communication
- Video calls
- Low-latency requirements
- When you want to reduce server load

**Example Implementation**:
```typescript
// Using native WebRTC (no package)
const peerConnection = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
})

// Add audio track
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
stream.getTracks().forEach(track => {
  peerConnection.addTrack(track, stream)
})
```

---

### 3. SIP/RTP (Telephony Protocol)

**Type**: Requires npm packages (not native)

**Popular npm Packages**:
```bash
npm install sip.js               # SIP.js library (recommended)
npm install jssip                # JsSIP library
npm install sipml5               # SIPml5 (older, less maintained)
```

**Pros**:
- ✅ Industry standard (telephony)
- ✅ Works with traditional phone systems
- ✅ Good for enterprise VoIP
- ✅ Mature protocol

**Cons**:
- ❌ Requires SIP server
- ❌ More complex than WebRTC
- ❌ Not peer-to-peer (needs SIP proxy)
- ❌ Additional packages required

**When to Use**:
- Integration with traditional phone systems
- Enterprise VoIP solutions
- When you need SIP compatibility
- PBX integration

**Example Implementation**:
```typescript
// Using sip.js package
import { UserAgent, Registerer } from 'sip.js'

const userAgent = new UserAgent({
  uri: 'sip:user@example.com',
  transportOptions: {
    server: 'wss://sip.example.com'
  }
})

await userAgent.start()
```

---

## Current Architecture

Your current implementation uses:
- ✅ **WebSocket** (native) - For bidirectional communication
- ✅ **MediaRecorder API** (native) - For audio capture
- ✅ **Web Audio API** (native) - For audio playback
- ✅ **getUserMedia** (native) - For microphone access

**No npm packages needed** for the current implementation!

---

## When to Add Packages

### Add WebRTC if you want:
1. **Lower latency** - Direct peer-to-peer
2. **Better quality** - Native codec optimization
3. **Video support** - Easy to add video tracks
4. **Reduced server load** - Less bandwidth on server

**Recommended Package**: `simple-peer` (easiest) or native WebRTC APIs

### Add SIP/RTP if you need:
1. **Phone system integration** - Connect to traditional telephony
2. **Enterprise VoIP** - Corporate phone systems
3. **SIP compatibility** - Work with existing SIP infrastructure

**Recommended Package**: `sip.js` (most modern and maintained)

---

## Implementation Recommendations

### For Your Use Case (AI Assistant):

**Current (WebSocket) is Good For**:
- ✅ Server-side AI processing
- ✅ Centralized control
- ✅ Simple architecture
- ✅ Easy debugging

**Consider WebRTC if**:
- You want to add video
- You need lower latency
- You want to reduce server bandwidth
- You're doing peer-to-peer calls

**Consider SIP/RTP if**:
- You need to integrate with phone systems
- You're building enterprise VoIP
- You need SIP protocol support

---

## Package Installation (if needed)

### For WebRTC (optional):
```bash
# Simple wrapper (easiest)
npm install simple-peer
npm install @types/simple-peer --save-dev

# Or use native WebRTC APIs (no package needed)
```

### For SIP/RTP:
```bash
# Modern SIP library
npm install sip.js

# Or alternative
npm install jssip
```

---

## Code Examples

### Current: WebSocket (No Package)
```typescript
// Already implemented in your codebase
const ws = new WebSocket('ws://localhost:8000/voice')
const recorder = new MediaRecorder(stream)
recorder.ondataavailable = (event) => {
  ws.send(event.data) // Send audio chunks
}
```

### Alternative: WebRTC (Native - No Package)
```typescript
const pc = new RTCPeerConnection()
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
stream.getTracks().forEach(track => pc.addTrack(track, stream))

// Create offer and send to server
const offer = await pc.createOffer()
await pc.setLocalDescription(offer)
// Send offer to server via WebSocket signaling
```

### Alternative: WebRTC (With Package)
```typescript
import Peer from 'simple-peer'

const peer = new Peer({ initiator: true, trickle: false })
peer.on('signal', (data) => {
  // Send signaling data to server
})
peer.on('stream', (stream) => {
  // Receive audio stream
})
```

### Alternative: SIP/RTP (Requires Package)
```typescript
import { UserAgent, Registerer, Inviter } from 'sip.js'

const userAgent = new UserAgent({
  uri: 'sip:user@domain.com',
  transportOptions: {
    server: 'wss://sip-server.com'
  }
})

const inviter = new Inviter(userAgent, 'sip:target@domain.com')
await inviter.invite()
```

---

## Summary

| Technology | Native API? | Package Needed? | Best For |
|------------|-------------|-----------------|----------|
| **WebSocket** | ✅ Yes | ❌ No | Server streaming, AI processing |
| **WebRTC** | ✅ Yes | ⚠️ Optional | Peer-to-peer, low latency |
| **SIP/RTP** | ❌ No | ✅ Yes | Telephony, enterprise VoIP |

**Your current implementation is correct** - using native WebSocket APIs is the right choice for an AI assistant that processes audio on the server!

