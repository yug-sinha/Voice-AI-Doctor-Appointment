'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Volume2, Activity, Users, Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface VoiceAssistantProps {
  backendUrl?: string
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ 
  backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'ws://localhost:8000' 
}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [audioLevel, setAudioLevel] = useState(0)
  
  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()

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
      const wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/voice'
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        setConnectionStatus('connected')
        addMessage('assistant', 'Hello! I\'m your hospital appointment assistant. How can I help you today?')
      }

      wsRef.current.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          // Handle audio response
          await playAudioResponse(event.data)
        } else {
          // Handle text message
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'transcript') {
              addMessage('assistant', data.message)
            }
          } catch (e) {
            console.log('Received non-JSON message:', event.data)
          }
        }
      }

      wsRef.current.onclose = () => {
        setIsConnected(false)
        setConnectionStatus('disconnected')
        setIsListening(false)
        setIsSpeaking(false)
      }

      wsRef.current.onerror = () => {
        setConnectionStatus('error')
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
    stopListening()
  }

  const updateAudioLevel = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      setAudioLevel(average / 255)
      
      if (isListening) {
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
      }
    }
  }

  const startListening = async () => {
    if (!isConnected || isListening) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      })

      // Setup audio analysis
      audioContextRef.current = new AudioContext({ sampleRate: 16000 })
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      updateAudioLevel()

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(event.data)
        }
      }

      mediaRecorderRef.current.start(100) // Send chunks every 100ms
      setIsListening(true)
      
    } catch (error) {
      console.error('Error starting audio recording:', error)
      addMessage('assistant', 'Sorry, I couldn\'t access your microphone. Please check permissions.')
    }
  }

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    setIsListening(false)
    setAudioLevel(0)
  }

  const playAudioResponse = async (audioBlob: Blob) => {
    try {
      setIsSpeaking(true)
      
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      
      source.onended = () => {
        setIsSpeaking(false)
      }
      
      source.start()
    } catch (error) {
      console.error('Error playing audio:', error)
      setIsSpeaking(false)
    }
  }

  const toggleConnection = () => {
    if (isConnected) {
      disconnectWebSocket()
    } else {
      connectWebSocket()
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  useEffect(() => {
    return () => {
      disconnectWebSocket()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case 'connecting': return <Activity className="w-5 h-5 text-amber-500 animate-spin" />
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      case 'error': return 'Connection Error'
      default: return 'Disconnected'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <div className="relative overflow-hidden bg-white/10 backdrop-blur-xl border-b border-white/20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="relative px-6 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Activity className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              AI Hospital Assistant
            </h1>
            <p className="text-xl text-white/80 mb-6">
              Book appointments using natural voice commands
            </p>
            
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
              {getStatusIcon()}
              <span className="text-white font-medium">{getStatusText()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Control Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Voice Control</h2>
                <p className="text-white/70">
                  {!isConnected ? 'Connect to start conversation' :
                   isSpeaking ? 'AI is speaking...' :
                   isListening ? 'Listening to your voice...' :
                   'Tap the microphone to speak'}
                </p>
              </div>

              {/* Connection Control */}
              <div className="flex justify-center mb-8">
                <button
                  onClick={toggleConnection}
                  disabled={connectionStatus === 'connecting'}
                  className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isConnected 
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25' 
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                  }`}
                >
                  {isConnected ? <PhoneOff className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                  {connectionStatus === 'connecting' ? 'Connecting...' :
                   isConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>

              {/* Voice Control */}
              {isConnected && (
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <button
                      onClick={toggleListening}
                      className={`relative w-32 h-32 rounded-full transition-all duration-300 transform hover:scale-105 ${
                        isSpeaking ? 'bg-purple-500 shadow-lg shadow-purple-500/50' :
                        isListening ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse' :
                        'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25'
                      }`}
                    >
                      {isSpeaking ? (
                        <Volume2 className="w-12 h-12 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      ) : isListening ? (
                        <MicOff className="w-12 h-12 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      ) : (
                        <Mic className="w-12 h-12 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </button>
                    
                    {/* Audio Level Indicator */}
                    {isListening && (
                      <div className="absolute inset-0 rounded-full border-4 border-white/30"
                           style={{
                             transform: `scale(${1 + audioLevel * 0.5})`,
                             transition: 'transform 0.1s'
                           }}>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-white/80 text-lg font-medium">
                    {isSpeaking ? '🔊 AI is responding' :
                     isListening ? '🎤 Listening...' :
                     '🎤 Tap to speak'}
                  </div>
                  
                  {!isListening && !isSpeaking && (
                    <p className="text-white/60 text-sm mt-2">
                      Try: "Book an appointment with Dr. Smith"
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Conversation History */}
            {messages.length > 0 && (
              <div className="mt-8 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Conversation History
                </h3>
                <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-2xl transition-all duration-300 ${
                        message.type === 'user' 
                          ? 'ml-8 bg-blue-500/20 border border-blue-400/30' 
                          : 'mr-8 bg-purple-500/20 border border-purple-400/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          message.type === 'user' ? 'bg-blue-500' : 'bg-purple-500'
                        }`}>
                          {message.type === 'user' ? '👤' : '🤖'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white text-sm">
                              {message.type === 'user' ? 'You' : 'AI Assistant'}
                            </span>
                            <span className="text-white/50 text-xs">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-white/90">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Doctor Information */}
          <div className="space-y-6">
            {/* Available Doctors */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Available Doctors
              </h3>
              <div className="space-y-4">
                {[
                  { name: 'Dr. John Smith', specialty: 'Cardiology', color: 'from-red-500 to-pink-500' },
                  { name: 'Dr. Sarah Lee', specialty: 'Dermatology', color: 'from-green-500 to-emerald-500' },
                  { name: 'Dr. Michael Johnson', specialty: 'Orthopedics', color: 'from-blue-500 to-cyan-500' }
                ].map((doctor, index) => (
                  <div key={index} className="bg-white/5 rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${doctor.color} flex items-center justify-center shadow-lg`}>
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{doctor.name}</h4>
                        <p className="text-white/70 text-sm">{doctor.specialty}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Commands */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Voice Commands
              </h3>
              <div className="space-y-3">
                {[
                  '📅 "Book appointment with Dr. Smith"',
                  '🔍 "What doctors are available?"',
                  '⏰ "Show Dr. Lee\'s schedule"',
                  '❌ "Cancel my appointment"',
                  '📋 "List all appointments"'
                ].map((command, index) => (
                  <div key={index} className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <p className="text-white/80 text-sm">{command}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Info */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                System Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Connection:</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <span className="text-white text-sm">{getStatusText()}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Audio:</span>
                  <span className="text-white text-sm">
                    {isListening ? 'Recording' : isSpeaking ? 'Playing' : 'Ready'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  )
}

export default VoiceAssistant
