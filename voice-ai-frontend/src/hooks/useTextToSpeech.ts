/**
 * Hook for Text-to-Speech functionality
 * Manages speaking text responses from the AI
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { speakText, stopSpeaking, isSpeaking } from '@/utils/textToSpeech'

interface UseTextToSpeechReturn {
  isSpeaking: boolean
  speak: (text: string) => Promise<void>
  stop: () => void
  isSupported: boolean
}

export const useTextToSpeech = (autoSpeak: boolean = true): UseTextToSpeechReturn => {
  const [isSpeakingState, setIsSpeakingState] = useState(false)
  const isSupportedRef = useRef(false)

  useEffect(() => {
    isSupportedRef.current = 'speechSynthesis' in window
    
    // Load voices (they might not be available immediately)
    if (isSupportedRef.current) {
      // Some browsers need voices to be loaded
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          console.log('Loaded', voices.length, 'voices')
        }
      }
      
      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  const speak = useCallback(async (text: string) => {
    if (!isSupportedRef.current || !autoSpeak) {
      return
    }

    try {
      setIsSpeakingState(true)
      await speakText(text, {
        rate: 0.9,
        pitch: 1,
        volume: 1,
      })
    } catch (error) {
      console.error('Error speaking text:', error)
    } finally {
      setIsSpeakingState(false)
    }
  }, [autoSpeak])

  const stop = useCallback(() => {
    stopSpeaking()
    setIsSpeakingState(false)
  }, [])

  // Check if currently speaking
  useEffect(() => {
    if (isSpeakingState) {
      const interval = setInterval(() => {
        if (!isSpeaking()) {
          setIsSpeakingState(false)
          clearInterval(interval)
        }
      }, 100)

      return () => clearInterval(interval)
    }
  }, [isSpeakingState])

  return {
    isSpeaking: isSpeakingState,
    speak,
    stop,
    isSupported: isSupportedRef.current,
  }
}

