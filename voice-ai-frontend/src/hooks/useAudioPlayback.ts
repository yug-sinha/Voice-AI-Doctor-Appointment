import { useState, useRef, useCallback, useEffect } from 'react'
import { createAudioContext, playAudioBlob } from '@/utils/audio'
import { PCM16AudioPlayer, AudioFormat } from '@/utils/audioPlayback'

interface UseAudioPlaybackReturn {
  isSpeaking: boolean
  playAudio: (audioBlob: Blob | ArrayBuffer) => Promise<void>
  playPCM16Chunk: (pcm16Data: ArrayBuffer) => Promise<void>
  setAudioFormat: (format: AudioFormat) => void
}

export const useAudioPlayback = (): UseAudioPlaybackReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const pcm16PlayerRef = useRef<PCM16AudioPlayer | null>(null)
  const audioFormatRef = useRef<AudioFormat | null>(null)

  const setAudioFormat = useCallback((format: AudioFormat) => {
    audioFormatRef.current = format
    console.log('Audio format set:', format)
    
    // Create audio context with the correct sample rate
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: format.sample_rate })
    }

    // Create PCM16 player
    if (!pcm16PlayerRef.current) {
      pcm16PlayerRef.current = new PCM16AudioPlayer(
        audioContextRef.current,
        format.sample_rate
      )
    }
  }, [])

  const playAudio = useCallback(async (audioBlob: Blob | ArrayBuffer) => {
    try {
      setIsSpeaking(true)

      if (!audioContextRef.current) {
        audioContextRef.current = createAudioContext()
      }

      // If it's an ArrayBuffer, it's likely PCM16 - use the player
      if (audioBlob instanceof ArrayBuffer) {
        if (!pcm16PlayerRef.current) {
          // Default to 24kHz if format not set yet
          const defaultFormat: AudioFormat = {
            encoding: 'pcm16',
            sample_rate: 24000,
            channels: 1,
          }
          setAudioFormat(defaultFormat)
        }
        
        const pcm16Data = new Int16Array(audioBlob)
        await pcm16PlayerRef.current!.addChunk(pcm16Data)
      } else {
        // It's a Blob (WAV/WebM), use the old method
        await playAudioBlob(audioBlob, audioContextRef.current)
      }
    } catch (error) {
      console.error('Error playing audio:', error)
    } finally {
      setIsSpeaking(false)
    }
  }, [setAudioFormat])

  const playPCM16Chunk = useCallback(async (pcm16Data: ArrayBuffer) => {
    await playAudio(pcm16Data)
  }, [playAudio])

  useEffect(() => {
    return () => {
      if (pcm16PlayerRef.current) {
        pcm16PlayerRef.current.stop()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return {
    isSpeaking,
    playAudio,
    playPCM16Chunk,
    setAudioFormat,
  }
}
