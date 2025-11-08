import { Mic } from 'lucide-react'

interface LiveTranscriptProps {
  transcript: string
  interimTranscript: string
  isListening: boolean
  error?: string | null
}

export const LiveTranscript = ({
  transcript,
  interimTranscript,
  isListening,
  error,
}: LiveTranscriptProps) => {
  // Show interim (in-progress) transcript in a different style
  const displayText = transcript || interimTranscript

  // Always show when there's text or when listening
  if (!isListening && !displayText && !error) {
    return null
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 backdrop-blur">
      <div className="flex items-center gap-2 mb-2">
        <Mic className="w-4 h-4 text-emerald-300" />
        <span className="font-medium">Live Transcript</span>
        {isListening && (
          <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></span>
        )}
      </div>

      {error ? (
        <p className="text-rose-200">{error}</p>
      ) : displayText ? (
        <div className="space-y-1">
          {transcript && <p className="text-white font-medium">{transcript}</p>}
          {interimTranscript && (
            <p className="text-white/60 italic">{interimTranscript}</p>
          )}
        </div>
      ) : (
        <p className="text-white/40 italic">Say anything to start your request…</p>
      )}
    </div>
  )
}
