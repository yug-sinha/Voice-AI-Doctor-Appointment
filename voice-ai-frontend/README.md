# Voice AI Hospital Assistant - Frontend

A modern, well-structured Next.js frontend application that provides a beautiful voice interface for booking hospital appointments.

## Features

- 🎤 **Voice Interaction**: Real-time voice conversation with the AI assistant
- 🎨 **Modern UI**: Beautiful gradient design with glass-morphism effects
- 📱 **Responsive**: Works seamlessly on desktop and mobile devices
- 🔊 **Audio Feedback**: Real-time audio responses from the AI
- 💬 **Live Transcript**: See the conversation history with beautiful message bubbles
- 🏥 **Doctor Information**: Display available doctors and specialties
- 🔄 **Real-time Status**: Connection and conversation status indicators
- 📊 **Audio Visualization**: Visual feedback for audio input levels
- 🎯 **Type-Safe**: Full TypeScript support with proper type definitions

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom animations
- **Icons**: Lucide React
- **Audio**: Web Audio API and MediaRecorder API
- **Communication**: WebSocket for real-time audio streaming
- **TypeScript**: Full type safety with strict mode
- **Architecture**: Modular, component-based architecture with custom hooks

## Project Structure

```
voice-ai-frontend/
├── src/
│   ├── app/
│   │   ├── globals.css        # Global styles and animations
│   │   ├── layout.tsx         # Root layout component
│   │   └── page.tsx          # Home page
│   ├── components/
│   │   ├── ui/               # Reusable UI components
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── VoiceButton.tsx
│   │   │   └── DoctorCard.tsx
│   │   ├── ConversationHistory.tsx
│   │   ├── DoctorsList.tsx
│   │   ├── ProtectedApp.tsx
│   │   └── VoiceAssistant.tsx # Main voice interface component
│   ├── hooks/                 # Custom React hooks
│   │   ├── useWebSocket.ts
│   │   ├── useAudioRecording.ts
│   │   ├── useAudioPlayback.ts
│   │   ├── useSpeechRecognition.ts
│   │   ├── useTextToSpeech.ts
│   │   └── useMessages.ts
│   ├── utils/                 # Utility functions
│   │   ├── websocket.ts
│   │   ├── audio.ts
│   │   ├── audioPlayback.ts
│   │   └── textToSpeech.ts
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts
│   └── constants/             # Application constants
│       └── index.ts
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── .env.example
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Navigate to the frontend folder:
```bash
cd voice-ai-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=ws://localhost:8000
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Architecture

### Component Structure

The application follows a modular architecture:

- **UI Components** (`components/ui/`): Reusable, presentational components
- **Feature Components** (`components/`): Higher-level components that compose UI components
- **Custom Hooks** (`hooks/`): Encapsulate business logic and state management
- **Utilities** (`utils/`): Pure functions for common operations
- **Types** (`types/`): TypeScript type definitions
- **Constants** (`constants/`): Application-wide constants

### Key Components

#### VoiceAssistant Component

The main component that orchestrates:
- WebSocket connection management
- Audio recording and playback
- Message handling
- UI state management

#### Custom Hooks

- **useWebSocket**: Manages WebSocket connection lifecycle
- **useAudioRecording**: Handles microphone access and audio recording
- **useAudioPlayback**: Manages audio playback from AI responses
- **useMessages**: Manages conversation message history

### Features

#### Voice Controls
- **Connect/Disconnect**: Establish WebSocket connection
- **Push-to-Talk**: Click to start/stop recording
- **Audio Playback**: Automatic playback of AI responses
- **Status Indicators**: Visual feedback for all states
- **Audio Level Visualization**: Real-time audio input level display

#### UI Features
- **Glass Morphism**: Modern translucent design with backdrop blur
- **Gradient Background**: Beautiful purple-blue gradient
- **Animations**: Smooth transitions and pulse effects
- **Responsive Design**: Mobile-first approach, works on all screen sizes
- **Accessibility**: Clear visual indicators and status messages
- **Custom Scrollbar**: Styled scrollbars for better UX

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Edge 79+
- ✅ Firefox 55+
- ✅ Safari 11+

**Note**: Microphone access requires HTTPS in production.

## Environment Variables

- `NEXT_PUBLIC_BACKEND_URL`: WebSocket URL for the backend API
  - Local: `ws://localhost:8000`
  - Production: `wss://your-backend-url.com`

## Development Notes

### Audio Handling
- Uses MediaRecorder API for audio capture
- Sends audio chunks in real-time via WebSocket
- Implements Web Audio API for playback
- Handles browser permissions gracefully
- Audio level visualization using AnalyserNode

### State Management
- React hooks for local state
- Custom hooks for complex state logic
- Real-time status updates
- Message history management
- Connection state handling

### Error Handling
- Graceful WebSocket disconnection
- Microphone permission errors
- Audio playback failures
- Network connectivity issues
- User-friendly error messages

### Performance
- Audio chunks are streamed in real-time
- Minimal latency with 100ms chunk intervals
- Efficient memory usage with audio cleanup
- Optimized animations with CSS transforms
- Proper cleanup on component unmount

## Customization

### Styling
All styles are in Tailwind CSS and can be customized in:
- `tailwind.config.js` - Theme configuration
- `globals.css` - Custom CSS and animations
- Component files - Component-specific styles

### Voice Settings
Audio settings can be modified in `src/constants/index.ts`:
- Sample rate (currently 16kHz)
- Audio format (WebM/Opus)
- Chunk size (100ms intervals)

### Doctors List
Update the doctors list in `src/constants/index.ts`:
```typescript
export const DOCTORS: Doctor[] = [
  { id: '1', name: 'Dr. John Smith', specialty: 'Cardiology', color: 'from-red-500 to-pink-500' },
  // Add more doctors...
]
```

## Troubleshooting

### Common Issues

1. **Microphone not working**
   - Check browser permissions
   - Ensure HTTPS in production
   - Verify MediaRecorder support
   - Check browser console for errors

2. **WebSocket connection fails**
   - Check backend URL in environment variables
   - Verify backend is running
   - Check CORS configuration
   - Verify WebSocket endpoint path (`/voice`)

3. **Audio not playing**
   - Check browser autoplay policies
   - Verify Web Audio API support
   - Check audio codec compatibility
   - Ensure audio context is not suspended

4. **TypeScript errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check that `tsconfig.json` paths are correct
   - Verify all imports use the `@/` alias

## Deployment on Vercel

1. Connect your GitHub repository to Vercel
2. Set the build command: `npm run build`
3. Set the output directory: `.next`
4. Add environment variable: `NEXT_PUBLIC_BACKEND_URL` (your backend WebSocket URL)
5. Deploy

## Code Quality

- ✅ TypeScript strict mode enabled
- ✅ ESLint configured
- ✅ Modular architecture
- ✅ Reusable components
- ✅ Custom hooks for logic separation
- ✅ Proper error handling
- ✅ Clean code principles

## Contributing

1. Follow the existing code structure
2. Use TypeScript for all new files
3. Create reusable components when possible
4. Add proper error handling
5. Update types when adding new features
6. Follow the naming conventions

## License

MIT
