import { Phone, PhoneOff } from 'lucide-react'
import { ConnectionStatus } from '@/types'

interface ConnectionButtonProps {
  isConnected: boolean
  status: ConnectionStatus
  onClick: () => void
  disabled?: boolean
}

export const ConnectionButton = ({
  isConnected,
  status,
  onClick,
  disabled = false,
}: ConnectionButtonProps) => {
  const getButtonStyle = () => {
    if (isConnected) {
      return 'bg-black hover:bg-gray-800 text-white border border-gray-800'
    }
    return 'bg-black hover:bg-gray-800 text-white border border-gray-800'
  }

  const getButtonText = () => {
    if (status === 'connecting') {
      return 'Connecting...'
    }
    return isConnected ? 'Disconnect' : 'Connect'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || status === 'connecting'}
      className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonStyle()}`}
    >
      {isConnected ? <PhoneOff className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
      {getButtonText()}
    </button>
  )
}

