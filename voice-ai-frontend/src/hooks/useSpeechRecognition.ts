/**
 * Real-time Speech-to-Text (STT) using Web Speech API
 * Shows what the user is speaking in real-time
 */

import { useState, useRef, useCallback, useEffect } from 'react'

interface UseSpeechRecognitionReturn {
  transcript: string
  isListening: boolean
  interimTranscript: string
  finalTranscript: string
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  error: string | null
  isSupported: boolean
}

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition
    }
    webkitSpeechRecognition: {
      new (): SpeechRecognition
    }
  }
}

export const useSpeechRecognition = (
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void
): UseSpeechRecognitionReturn => {
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isSupportedRef = useRef<boolean>(false)

  // Check if Speech Recognition is supported
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    isSupportedRef.current = !!SpeechRecognition

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            final += transcript + ' '
          } else {
            interim += transcript
          }
        }

        setInterimTranscript(interim)
        setFinalTranscript(final.trim())

        const fullTranscript = final + interim
        setTranscript(fullTranscript.trim())

        // Callback for real-time updates
        if (onTranscriptUpdate) {
          onTranscriptUpdate(fullTranscript.trim(), final.length > 0)
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorCode = event.error
        const errorMessage = event.message || event.error
        
        // Don't treat 'no-speech' as a critical error - it's normal
        if (errorCode === 'no-speech') {
          console.log('No speech detected (this is normal)')
          setError(null)
          return
        }
        
        // Network errors - speech recognition needs internet connection
        if (errorCode === 'network') {
          console.warn('Speech recognition network error - requires internet connection')
          setError('Network error: Speech recognition requires internet connection. Your audio will still be sent to the server for transcription.')
          setIsListening(false)
          return
        }
        
        // Other errors are important
        setError(`${errorCode}: ${errorMessage}`)
        setIsListening(false)
        console.error('Speech recognition error:', errorCode, errorMessage)
        
        // For some errors, we might want to retry
        if (errorCode === 'audio-capture' || errorCode === 'not-allowed') {
          console.error('Microphone access issue. Check permissions.')
        }
      }

      recognition.onend = () => {
        setIsListening(false)
        console.log('Speech recognition ended')
        // Don't auto-restart - let the component control it
      }

      recognition.onstart = () => {
        console.log('Speech recognition started')
        setIsListening(true)
        setError(null)
      }

      recognitionRef.current = recognition
    }
  }, [onTranscriptUpdate])

  const startListening = useCallback(() => {
    if (!isSupportedRef.current) {
      setError('Speech recognition is not supported in this browser')
      console.warn('Speech recognition not supported')
      return
    }

    if (!recognitionRef.current) {
      setError('Speech recognition not initialized')
      console.error('Speech recognition not initialized')
      return
    }

    // Check if already listening
    if (isListening) {
      console.log('Speech recognition already listening')
      return
    }

    try {
      console.log('Attempting to start speech recognition...')
      recognitionRef.current.start()
    } catch (err: any) {
      // Already started or other error
      const errorMsg = err?.message || 'Unknown error'
      console.error('Error starting speech recognition:', errorMsg, err)
      setError(`Failed to start: ${errorMsg}`)
      
      // If it's already started, update state
      if (errorMsg.includes('already') || errorMsg.includes('started')) {
        setIsListening(true)
      }
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [isListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setFinalTranscript('')
  }, [])

  return {
    transcript,
    isListening,
    interimTranscript,
    finalTranscript,
    startListening,
    stopListening,
    resetTranscript,
    error,
    isSupported: isSupportedRef.current,
  }
}

