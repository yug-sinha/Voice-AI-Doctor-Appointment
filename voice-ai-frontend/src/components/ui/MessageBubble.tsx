import { Message } from '@/types'

interface MessageBubbleProps {
  message: Message
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.type === 'user'
  const isSystem = message.type === 'system'

  return (
    <div
      className={`p-3 sm:p-4 rounded-2xl border backdrop-blur transition-all duration-300 ${
        isSystem
          ? 'mx-0 bg-white/5 border-white/15 text-emerald-100 shadow-emerald-500/10 shadow-lg'
          : isUser
          ? 'ml-4 sm:ml-8 bg-emerald-400/15 border-emerald-300/30 text-emerald-50 shadow-emerald-500/10 shadow-lg'
          : 'mr-4 sm:mr-8 bg-white/10 border-white/10 text-white shadow-black/20 shadow-lg'
      }`}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base ${
            isSystem
              ? 'bg-white/15 text-white'
              : isUser
              ? 'bg-emerald-400/30 text-emerald-100'
              : 'bg-white/20 text-white'
          }`}
        >
          {isSystem ? '📣' : isUser ? '👤' : '🤖'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-xs sm:text-sm">
              {isSystem ? 'System' : isUser ? 'You' : 'AI Assistant'}
            </span>
            <span className="text-white/50 text-xs">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed break-words">{message.content}</p>
        </div>
      </div>
    </div>
  )
}
