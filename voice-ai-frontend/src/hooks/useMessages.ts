import { useState, useCallback } from 'react'
import { Message } from '@/types'

interface UseMessagesReturn {
  messages: Message[]
  addMessage: (type: Message['type'], content: string) => void
  clearMessages: () => void
}

export const useMessages = (): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([])

  const addMessage = useCallback((type: Message['type'], content: string) => {
    const message: Message = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, message])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    addMessage,
    clearMessages,
  }
}
