'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Send } from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const VoiceAssistant = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [textInput, setTextInput] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  
  const wsRef = useRef<WebSocket | null>(null)

  const addMessage = (type: 'user' | 'assistant', content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, message])
  }

  const connectWebSocket = async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setConnectionStatus('connecting')
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'ws://localhost:8000'
      const wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/voice'
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        setConnectionStatus('connected')
        console.log('WebSocket connected')
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'audio_response') {
            addMessage('assistant', data.message)
            // Use speech synthesis for text-to-speech
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(data.message)
              utterance.rate = 0.9
              utterance.pitch = 1
              speechSynthesis.speak(utterance)
            }
          } else if (data.type === 'error') {
            addMessage('assistant', data.message)
          }
        } catch (error) {
          console.error('Error parsing message:', error)
        }
      }

      wsRef.current.onclose = () => {
        setIsConnected(false)
        setConnectionStatus('disconnected')
        console.log('WebSocket disconnected')
      }

      wsRef.current.onerror = (error) => {
        setConnectionStatus('error')
        console.error('WebSocket error:', error)
        addMessage('assistant', 'Connection error. Please try again.')
      }
    } catch (error) {
      setConnectionStatus('error')
      console.error('WebSocket connection error:', error)
    }
  }

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }

  const sendMessage = () => {
    if (!textInput.trim() || !isConnected) return

    // Add user message to chat
    addMessage('user', textInput)

    // Send to backend
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'text_message',
        message: textInput
      }))
    }

    setTextInput('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toggleConnection = () => {
    if (isConnected) {
      disconnectWebSocket()
    } else {
      connectWebSocket()
    }
  }

  useEffect(() => {
    return () => {
      disconnectWebSocket()
    }
  }, [])

  const getConnectionButtonColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500 hover:bg-green-600'
      case 'connecting': return 'bg-yellow-500 hover:bg-yellow-600'
      case 'error': return 'bg-red-500 hover:bg-red-600'
      default: return 'bg-blue-500 hover:bg-blue-600'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            🏥 Voice AI Assistant
          </h1>
          <p className="text-xl text-white/80 mb-6">
            Book your hospital appointments using voice commands
          </p>
          
          {/* Connection Status */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
              connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
              connectionStatus === 'error' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {connectionStatus === 'connected' ? '🟢 Connected' :
               connectionStatus === 'connecting' ? '🟡 Connecting...' :
               connectionStatus === 'error' ? '🔴 Connection Error' :
               '⚪ Disconnected'}
            </div>
          </div>
        </div>

        {/* Main Control Panel */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 mb-6 border border-white/20">
          <div className="flex flex-col items-center gap-6">
            
            {/* Connection Button */}
            <button
              onClick={toggleConnection}
              disabled={connectionStatus === 'connecting'}
              className={`${getConnectionButtonColor()} text-white px-6 py-3 rounded-full transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
            >
              {isConnected ? <PhoneOff size={24} /> : <Phone size={24} />}
              <span className="font-medium">
                {connectionStatus === 'connecting' ? 'Connecting...' :
                 isConnected ? 'Disconnect' : 'Connect'}
              </span>
            </button>

            {/* Text Input for Testing */}
            {isConnected && (
              <div className="w-full max-w-md flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message (e.g., 'What doctors are available?')"
                  className="flex-1 px-4 py-2 rounded-lg border border-white/30 bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!textInput.trim()}
                  className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Conversation Transcript */}
        {messages.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              💬 Conversation
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-2xl transition-all duration-300 ${
                    message.type === 'user' 
                      ? 'bg-blue-500/20 text-white ml-8' 
                      : 'bg-white/10 text-white mr-8'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">
                      {message.type === 'user' ? '👤' : '🤖'}
                    </span>
                    <div>
                      <p className="font-medium text-sm opacity-75 mb-1">
                        {message.type === 'user' ? 'You' : 'AI Assistant'}
                      </p>
                      <p>{message.content}</p>
                      <p className="text-xs opacity-50 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Doctors Info */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 mt-6 border border-white/20">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            👨‍⚕️ Available Doctors
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4">
              <h4 className="text-white font-medium">Dr. John Smith</h4>
              <p className="text-white/70 text-sm">Cardiology</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <h4 className="text-white font-medium">Dr. Sarah Lee</h4>
              <p className="text-white/70 text-sm">Dermatology</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <h4 className="text-white font-medium">Dr. Michael Johnson</h4>
              <p className="text-white/70 text-sm">Orthopedics</p>
            </div>
          </div>
          
          {isConnected && (
            <div className="mt-4 p-4 bg-blue-500/20 rounded-xl">
              <h4 className="text-white font-medium mb-2">💡 Try these commands:</h4>
              <ul className="text-white/80 text-sm space-y-1">
                <li>• "What doctors are available?"</li>
                <li>• "Book an appointment with Dr. Smith"</li>
                <li>• "Show me Dr. Lee's schedule"</li>
                <li>• "Cancel my appointment"</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VoiceAssistant
