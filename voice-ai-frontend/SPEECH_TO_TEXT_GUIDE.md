# Real-Time Speech-to-Text (STT) Feature

## Overview

The application now includes **real-time speech-to-text transcription** so users can see what they're speaking as they talk. This provides visual feedback and improves the user experience.

## How It Works

### 1. **Browser-Based Speech Recognition** (Primary Method)

Uses the **Web Speech API** (`SpeechRecognition` or `webkitSpeechRecognition`) - a native browser API that requires **no npm packages**.

**Features**:
- ✅ Real-time transcription as user speaks
- ✅ Shows interim (in-progress) and final transcripts
- ✅ Automatically adds user messages to conversation
- ✅ Works in Chrome, Edge, Safari (with webkit prefix)
- ✅ No additional dependencies

**Browser Support**:
- ✅ Chrome/Edge: Full support
- ✅ Safari: Requires `webkitSpeechRecognition`
- ⚠️ Firefox: Not supported (falls back to server transcription)

### 2. **Server-Side Transcription** (Fallback)

If browser speech recognition is not supported, the backend can send user transcripts via WebSocket:

```json
{
  "type": "transcript",
  "message": "user_transcript:Book an appointment with Dr. Smith"
}
```

## Implementation Details

### Components Added

1. **`useSpeechRecognition` Hook** (`src/hooks/useSpeechRecognition.ts`)
   - Manages Web Speech API
   - Provides real-time transcript updates
   - Handles errors and browser compatibility

2. **`LiveTranscript` Component** (`src/components/ui/LiveTranscript.tsx`)
   - Displays what user is currently speaking
   - Shows interim (gray/italic) and final (white/bold) text
   - Visual indicator when listening

### Integration

The speech recognition is automatically:
- ✅ Started when user clicks microphone
- ✅ Stopped when user stops recording
- ✅ Synced with audio recording
- ✅ Adds final transcripts as user messages

## Usage

### For Users

1. Click the microphone button to start speaking
2. See your words appear in real-time below the microphone
3. Final transcript automatically added to conversation
4. Works seamlessly with audio recording

### For Developers

#### Using the Hook

```typescript
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

const {
  transcript,           // Full transcript (final + interim)
  interimTranscript,   // In-progress text (gray)
  finalTranscript,     // Completed text (white)
  isListening,         // Is recognition active?
  startListening,      // Start recognition
  stopListening,       // Stop recognition
  resetTranscript,     // Clear transcript
  error,               // Error message if any
  isSupported,         // Browser support check
} = useSpeechRecognition((transcript, isFinal) => {
  // Callback when transcript updates
  if (isFinal) {
    console.log('Final:', transcript)
  }
})
```

#### Using the Component

```tsx
import { LiveTranscript } from '@/components/ui/LiveTranscript'

<LiveTranscript
  transcript={speechTranscript}
  interimTranscript={interimTranscript}
  isListening={isSpeechListening}
  error={speechError}
/>
```

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Uses `SpeechRecognition` |
| Edge | ✅ Full | Uses `SpeechRecognition` |
| Safari | ✅ Full | Uses `webkitSpeechRecognition` |
| Firefox | ❌ Not Supported | Falls back to server transcription |

## Configuration

### Language

Default: `en-US`

To change language, modify `useSpeechRecognition.ts`:

```typescript
recognition.lang = 'en-US' // Change to your language code
```

### Recognition Settings

Current settings in the hook:
- `continuous: true` - Keep listening
- `interimResults: true` - Show partial results
- `lang: 'en-US'` - Language

## Error Handling

The hook handles common errors:
- **`no-speech`**: No speech detected
- **`audio-capture`**: Microphone not accessible
- **`not-allowed`**: Permission denied
- **`network`**: Network error

Errors are displayed in the `LiveTranscript` component.

## Fallback Behavior

If Web Speech API is not supported:
1. Shows warning message to user
2. Falls back to server-side transcription
3. Backend can send transcripts via WebSocket

## Backend Integration

If your backend transcribes audio, send user transcripts like this:

```json
{
  "type": "transcript",
  "message": "user_transcript:Your transcribed text here"
}
```

The frontend will automatically:
- Parse the message
- Add it as a user message
- Display it in the conversation

## Visual Design

The `LiveTranscript` component features:
- Glass morphism design (matches app theme)
- Real-time updates
- Visual distinction between interim and final text
- Listening indicator (pulsing dot)
- Error display

## Performance

- **Lightweight**: Uses native browser API
- **Real-time**: Updates as user speaks
- **Efficient**: Only processes when microphone is active
- **No extra packages**: Zero dependencies

## Troubleshooting

### Speech Recognition Not Working

1. **Check browser support**: Only Chrome/Edge/Safari
2. **Check permissions**: Microphone access required
3. **Check HTTPS**: Required in production
4. **Check console**: Look for error messages

### Not Showing Transcripts

1. Verify `isSpeechSupported` is `true`
2. Check microphone permissions
3. Ensure `startSpeechListening()` is called
4. Check browser console for errors

### Transcripts Not Appearing in Conversation

- Final transcripts are automatically added
- Check if `onTranscriptUpdate` callback is working
- Verify `addMessage('user', transcript)` is called

## Future Enhancements

Possible improvements:
- [ ] Multi-language support toggle
- [ ] Confidence scores display
- [ ] Punctuation improvements
- [ ] Custom vocabulary for medical terms
- [ ] Offline recognition (if supported)

## Summary

✅ **Real-time STT implemented** using Web Speech API
✅ **No npm packages required** - uses native browser APIs
✅ **Automatic integration** with existing voice system
✅ **Fallback support** for unsupported browsers
✅ **Beautiful UI** with live transcript display

The feature is fully integrated and ready to use!

