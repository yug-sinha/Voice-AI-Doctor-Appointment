'use client'

import { CSSProperties, useEffect, useRef, useCallback, useState } from 'react'
import { Activity, Info, Phone, PhoneOff, Waves } from 'lucide-react'
import { VoiceAssistantProps, WebSocketMessage, Message } from '@/types'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAudioRecording } from '@/hooks/useAudioRecording'
import { useAudioPlayback } from '@/hooks/useAudioPlayback'
import { useMessages } from '@/hooks/useMessages'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { VoiceButton } from './ui/VoiceButton'
import { StatusBadge } from './ui/StatusBadge'
import { ConversationHistory } from './ConversationHistory'
import { DoctorsList } from './DoctorsList'

export const VoiceAssistant = ({ backendUrl }: VoiceAssistantProps) => {
  const { ws, isConnected, connectionStatus, connect, disconnect, send } = useWebSocket(
    backendUrl
  )
  const { messages, addMessage } = useMessages()
  const { isSpeaking: isPlayingAudio, playAudio, playPCM16Chunk, setAudioFormat } =
    useAudioPlayback()
  const { isSpeaking: isSpeakingTTS, speak: speakText, isSupported: isTTSSupported } =
    useTextToSpeech(true)

  const forwardAudioChunk = useCallback(
    (chunk: ArrayBuffer) => {
      send(chunk)
    },
    [send]
  )

  const { isListening, audioLevel, startRecording, stopRecording } = useAudioRecording(
    isConnected,
    forwardAudioChunk
  )

  const {
    transcript: speechTranscript,
    interimTranscript,
    finalTranscript,
    isListening: isSpeechListening,
    startListening: startSpeechListening,
    stopListening: stopSpeechListening,
    resetTranscript: resetSpeechTranscript,
    isSupported: isSpeechSupported,
  } = useSpeechRecognition((transcript, isFinal) => {
    if (isFinal && transcript.trim()) {
      addMessage('user', transcript)
      resetSpeechTranscript()
    }
  })

  const hasAutoStartedRef = useRef(false)

  const startVoiceCapture = async () => {
    if (isListening) return

    await startRecording()
    await new Promise((resolve) => setTimeout(resolve, 100))

    if (isSpeechSupported) {
      setTimeout(() => {
        try {
          startSpeechListening()
        } catch (err) {
          console.warn('Speech recognition failed, but audio recording works:', err)
        }
      }, 300)
    }
  }

  const stopVoiceCapture = (notifyBackend: boolean = true) => {
    stopRecording()
    stopSpeechListening()
    resetSpeechTranscript()

    if (notifyBackend && ws?.readyState === WebSocket.OPEN) {
      send(JSON.stringify({ type: 'audio_end' }))
    }
  }

  useEffect(() => {
    if (!ws) return

    const handleMessage = async (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        await playPCM16Chunk(event.data)
        return
      }

      if (event.data instanceof Blob) {
        await playAudio(event.data)
        return
      }

      try {
        const data: WebSocketMessage = JSON.parse(event.data as string)

        if (data.type === 'audio_format') {
          setAudioFormat({
            encoding: data.encoding || 'pcm16',
            sample_rate: data.sample_rate || 24000,
            channels: data.channels || 1,
          })
          return
        }

        if (data.type === 'transcript' && (data.message || data.content)) {
          const transcriptText = data.message || data.content || ''
          if (transcriptText.includes('user_transcript')) {
            const userText = transcriptText.replace('user_transcript:', '').trim()
            if (userText) addMessage('user', userText)
          } else {
            addMessage('assistant', transcriptText)
            if (isTTSSupported && transcriptText) {
              speakText(transcriptText).catch((error) => console.error(error))
            }
          }
          return
        }

        if (data.type === 'tool_event') {
          if (data.message) {
            const statusEmoji =
              data.status === 'success'
                ? '✅'
                : data.status === 'slot_unavailable'
                ? '⚠️'
                : 'ℹ️'
            addMessage('system', `${statusEmoji} ${data.message}`)
          }

          if (data.tool === 'end_call') {
            stopVoiceCapture()
            disconnect()
          }

          return
        }

        if (data.type === 'error' && (data.message || data.content)) {
          const errorText = data.message || data.content || 'An error occurred'
          addMessage('assistant', errorText)
          if (isTTSSupported) {
            speakText(errorText).catch((error) => console.error(error))
          }
        }
      } catch (err) {
        console.log('Received non-JSON message:', event.data)
      }
    }

    ws.addEventListener('message', handleMessage)
    return () => ws.removeEventListener('message', handleMessage)
  }, [ws, addMessage, playAudio, playPCM16Chunk, setAudioFormat, speakText, isTTSSupported])

  const handleToggleConnection = () => {
    if (isConnected) {
      stopVoiceCapture()
      disconnect()
      return
    }

    connect()
  }

  const handleMuteToggle = async () => {
    if (!isConnected) {
      addMessage('assistant', 'Please connect to the receptionist before speaking.')
      return
    }

    if (isListening) {
      stopVoiceCapture()
      return
    }

    try {
      await startVoiceCapture()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      let userMessage = 'Sorry, I could not access your microphone. '
      if (errorMsg.includes('permission')) {
        userMessage += 'Please allow microphone access in your browser.'
      } else if (errorMsg.includes('NotFoundError')) {
        userMessage += 'No microphone found. Please connect one.'
      } else if (errorMsg.includes('NotReadableError')) {
        userMessage += 'Microphone is being used by another application.'
      } else {
        userMessage += `Error: ${errorMsg}`
      }
      addMessage('assistant', userMessage)
      stopSpeechListening()
    }
  }

  useEffect(() => {
    if (isConnected) {
      if (!hasAutoStartedRef.current) {
        hasAutoStartedRef.current = true
        startVoiceCapture().catch((error) => {
          console.error('Auto-start recording failed:', error)
          hasAutoStartedRef.current = false
        })
      }
    } else {
      hasAutoStartedRef.current = false
      stopVoiceCapture(false)
    }
  }, [isConnected])

  const isSpeaking = isPlayingAudio || isSpeakingTTS

  const conversationalMessages = messages.filter((msg) => msg.type !== 'system')
  const systemMessages = messages.filter((msg) => msg.type === 'system')

  const callStatusText = (() => {
    if (!isConnected) return 'Tap start call to reach the AI receptionist'
    if (isListening) return 'Live — I am listening to you'
    if (isSpeaking) return 'Responding with appointment details'
    return 'On the line and ready for your request'
  })()

  return (
    <>
    <div className="min-h-screen lg:min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-48 -right-32 w-[540px] h-[540px] bg-emerald-500/20 blur-[220px]" />
        <div className="absolute top-1/3 -left-40 w-[480px] h-[480px] bg-cyan-500/10 blur-[200px]" />
      </div>

      <div className="relative z-10 h-full max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex flex-col gap-4 sm:gap-6 overflow-y-auto custom-scrollbar">
        <header className="text-center space-y-3 flex-none">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-white/70 text-sm">
            <Activity className="w-4 h-4 text-emerald-300" />
            Virtual Reception Desk
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold">Hospital Voice Concierge</h1>
            <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
              Speak naturally and let our AI receptionist manage bookings, cancellations, and doctor
              availability—all within a single screen.
            </p>
            <p className="text-emerald-200/80 text-xs sm:text-sm max-w-2xl mx-auto">
              If the call button spins for a while, the backend might be waking up from Render&apos;s sleep mode.
              Give it ~30s and try a hard refresh—your first request already triggered the service to boot.
            </p>
          </div>
        </header>

        <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 min-h-0">
          <div className="space-y-4 xl:space-y-6 xl:w-[360px] flex-shrink-0">
            <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-2xl p-4 sm:p-6 md:p-8 shadow-2xl shadow-emerald-500/10 flex flex-col gap-4 sm:gap-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Live Call</p>
                  <p className="text-2xl font-semibold">
                    {isConnected ? 'AI Receptionist' : 'Ready to connect'}
                  </p>
                  <p className="text-white/60 text-sm mt-1">{callStatusText}</p>
                </div>
                <StatusBadge status={connectionStatus} />
              </div>

              <div className="flex flex-col items-center gap-5">
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-36 h-36 rounded-full border border-white/10 bg-gradient-to-br ${
                      isConnected
                        ? 'from-emerald-400/60 to-cyan-400/40'
                        : 'from-white/10 to-white/5'
                    } flex items-center justify-center`}
                  >
                    <Waves className="w-12 h-12 text-white/80" />
                  </div>
                  <div
                    className="absolute inset-0 rounded-full border border-white/20"
                    style={{
                      opacity: isConnected ? 0.3 + audioLevel * 0.7 : 0.2,
                      transform: `scale(${1 + audioLevel * 0.4})`,
                      transition: 'all 0.2s ease-out',
                    }}
                  />
                  {isSpeaking && (
                    <div className="voice-wave absolute -bottom-6 flex items-end gap-1">
                      {Array.from({ length: 16 }).map((_, index) => (
                        <span
                          key={index}
                          className="voice-wave-bar block w-1.5 rounded-full bg-emerald-300/70"
                          style={{ animationDelay: `${index * 0.08}s` } as CSSProperties}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleToggleConnection}
                  className={`w-full flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-base font-semibold transition-all duration-300 ${
                    isConnected
                      ? 'bg-white/5 border border-white/10 hover:bg-white/10'
                      : 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-900 shadow-lg shadow-emerald-500/40 hover:shadow-emerald-500/60'
                  }`}
                >
                  {isConnected ? (
                    <>
                      <PhoneOff className="w-5 h-5" />
                      End Call
                    </>
                  ) : (
                    <>
                      <Phone className="w-5 h-5" />
                      Start Call
                    </>
                  )}
                </button>

                <VoiceButton
                  isListening={isListening}
                  isSpeaking={isSpeaking}
                  audioLevel={audioLevel}
                  onClick={handleMuteToggle}
                  disabled={!isConnected}
                />

                <div className="text-center text-xs text-white/60 -mt-1">
                  {isListening
                    ? 'Mic live — tap to mute yourself.'
                    : 'Mic muted — tap to resume.'}
                </div>
              </div>
            </div>

          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 auto-rows-min">
            <ConversationHistory messages={conversationalMessages} className="md:col-span-2" />
            <QuickPhrases />
            <DoctorsList compact />
            <SystemEvents messages={systemMessages} className="md:col-span-2" />
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        .voice-wave-bar {
          height: 24px;
          animation: voiceWave 1s ease-in-out infinite;
        }
        @keyframes voiceWave {
          0%,
          100% {
            transform: scaleY(0.3);
            opacity: 0.4;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
    <InfoBadge />
    </>
  )
}

export default VoiceAssistant

const QuickPhrases = () => {
  const phrases = [
    'Book Dr. Smith tomorrow 10 AM',
    'Cancel my dermatology visit',
    'Available slots today?',
    'Reschedule to Monday',
  ]

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/20 p-4 sm:p-5">
      <h3 className="text-base sm:text-lg font-semibold text-white mb-3">Quick Phrases</h3>
      <div className="flex flex-wrap gap-2">
        {phrases.map((phrase) => (
          <span
            key={phrase}
            className="px-2 sm:px-3 py-1 rounded-full border border-white/15 text-xs sm:text-sm text-white/80 bg-white/5 break-words"
          >
            {phrase}
          </span>
        ))}
      </div>
    </div>
  )
}

const InfoBadge = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-20">
      <div
        className={`mb-2 rounded-2xl border border-white/10 bg-slate-900/90 text-white/80 shadow-xl backdrop-blur-lg transition-all ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="px-4 py-3 space-y-1 text-sm">
          <p className="font-semibold text-white">Made by Yug</p>
          <p>Frontend: Vercel</p>
          <p>Backend: Render</p>
          <a
            href="https://github.com/yug-sinha/Voice-AI-Doctor-Appointment"
            target="_blank"
            rel="noreferrer"
            className="text-emerald-300 hover:text-emerald-200 underline text-xs"
          >
            GitHub Repository
          </a>
        </div>
      </div>

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="About this app"
        className="w-12 h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition shadow-lg"
      >
        <Info className="w-5 h-5" />
      </button>
    </div>
  )
}

interface SystemEventsProps {
  messages: Message[]
  className?: string
}

const SystemEvents = ({ messages, className = '' }: SystemEventsProps) => {
  if (messages.length === 0) return null

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/20 p-4 sm:p-5 ${className}`}
    >
      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <span className="text-emerald-300">📣</span>
        Recent Actions
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="text-sm text-emerald-50/90 border border-white/10 rounded-2xl px-3 py-2 bg-white/5"
          >
            <div className="text-xs text-white/50 mb-1">
              {msg.timestamp.toLocaleTimeString()}
            </div>
            <p className="leading-snug">{msg.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
