import { ConnectionStatus } from '@/types'
import { Activity, AlertCircle, CheckCircle } from 'lucide-react'

interface StatusBadgeProps {
  status: ConnectionStatus
  className?: string
}

export const StatusBadge = ({ status, className = '' }: StatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <CheckCircle className="w-5 h-5 text-emerald-300" />,
          text: 'Connected',
          bgColor: 'bg-emerald-500/15',
          textColor: 'text-emerald-100',
          borderColor: 'border-emerald-300/30',
        }
      case 'connecting':
        return {
          icon: <Activity className="w-5 h-5 text-amber-200 animate-spin" />,
          text: 'Connecting...',
          bgColor: 'bg-amber-500/15',
          textColor: 'text-amber-100',
          borderColor: 'border-amber-300/30',
        }
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-300" />,
          text: 'Connection Error',
          bgColor: 'bg-rose-500/15',
          textColor: 'text-rose-100',
          borderColor: 'border-rose-300/30',
        }
      default:
        return {
          icon: <AlertCircle className="w-5 h-5 text-white/50" />,
          text: 'Disconnected',
          bgColor: 'bg-white/5',
          textColor: 'text-white/60',
          borderColor: 'border-white/10',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur ${config.bgColor} ${config.borderColor} ${className}`}
    >
      {config.icon}
      <span className={`font-medium ${config.textColor}`}>{config.text}</span>
    </div>
  )
}
