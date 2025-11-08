import { Message } from '@/types'
import { MessageBubble } from './ui/MessageBubble'
import { Activity } from 'lucide-react'

interface ConversationHistoryProps {
  messages: Message[]
  className?: string
}

export const ConversationHistory = ({ messages, className = '' }: ConversationHistoryProps) => {
  if (messages.length === 0) {
    return null
  }

  const recentMessages = messages.slice(-4)

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 sm:p-5 shadow-2xl shadow-black/20 flex flex-col ${className}`}
    >
      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <Activity className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-300" />
        Recent Conversation
      </h3>
      <div className="space-y-3 flex-1 overflow-auto custom-scrollbar pr-2 min-h-0">
        {recentMessages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
    </div>
  )
}
