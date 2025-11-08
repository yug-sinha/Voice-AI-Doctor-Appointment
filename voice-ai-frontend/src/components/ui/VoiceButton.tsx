import { Mic, MicOff, Volume2 } from 'lucide-react'

interface VoiceButtonProps {
  isListening: boolean
  isSpeaking: boolean
  audioLevel: number
  onClick: () => void
  disabled?: boolean
}

export const VoiceButton = ({
  isListening,
  isSpeaking,
  audioLevel,
  onClick,
  disabled = false,
}: VoiceButtonProps) => {
  const getButtonStyle = () => {
    if (isSpeaking) {
      return 'bg-gray-800 border-2 border-gray-700'
    }
    if (isListening) {
      return 'bg-black border-2 border-gray-800 animate-pulse'
    }
    return 'bg-black hover:bg-gray-800 border-2 border-gray-900'
  }

  const getIcon = () => {
    if (isSpeaking) {
      return <Volume2 className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
    }
    if (isListening) {
      return <MicOff className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
    }
    return <Mic className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonStyle()}`}
        aria-label={isListening ? 'Stop recording' : 'Start recording'}
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {getIcon()}
        </div>
      </button>

      {/* Audio Level Indicator - Multiple rings */}
      {isListening && (
        <>
          <div
            className="absolute inset-0 rounded-full border-4 border-gray-400 pointer-events-none animate-ping"
            style={{
              transform: `scale(${1 + audioLevel * 0.3})`,
              transition: 'transform 0.1s',
            }}
          />
          <div
            className="absolute inset-0 rounded-full border-4 border-gray-500 pointer-events-none"
            style={{
              transform: `scale(${1 + audioLevel * 0.6})`,
              transition: 'transform 0.1s',
            }}
          />
        </>
      )}
    </div>
  )
}

