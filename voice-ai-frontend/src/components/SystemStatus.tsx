import { ConnectionStatus } from '@/types'
import { StatusBadge } from './ui/StatusBadge'
import { Clock } from 'lucide-react'

interface SystemStatusProps {
  connectionStatus: ConnectionStatus
  isListening: boolean
  isSpeaking: boolean
}

export const SystemStatus = ({
  connectionStatus,
  isListening,
  isSpeaking,
}: SystemStatusProps) => {
  const getAudioStatus = () => {
    if (isListening) return 'Recording'
    if (isSpeaking) return 'Playing'
    return 'Ready'
  }

  return (
    <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-4 sm:p-6 shadow-2xl shadow-black/20">
      <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
        <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-300" />
        Call Status
      </h3>
      <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-white/70">
        <div className="flex items-center justify-between">
          <span>Connection</span>
          <StatusBadge status={connectionStatus} />
        </div>
        <div className="flex items-center justify-between">
          <span>Audio Engine</span>
          <span className="text-white font-medium">{getAudioStatus()}</span>
        </div>
      </div>
    </div>
  )
}
