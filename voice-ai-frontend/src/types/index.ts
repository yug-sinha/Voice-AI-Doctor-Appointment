export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  type: MessageRole
  content: string
  timestamp: Date
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface Doctor {
  id: string
  name: string
  specialty: string
  color: string
}

export interface VoiceAssistantProps {
  backendUrl?: string
}

export interface WebSocketMessage {
  type: 'transcript' | 'audio_format' | 'error' | 'text_message' | 'user_transcript' | 'tool_event'
  message?: string
  content?: string // Backend also accepts 'content' instead of 'message'
  encoding?: string // For audio_format: 'pcm16'
  sample_rate?: number // For audio_format: 24000
  channels?: number // For audio_format: 1
  tool?: string
  status?: string
  data?: unknown
}
