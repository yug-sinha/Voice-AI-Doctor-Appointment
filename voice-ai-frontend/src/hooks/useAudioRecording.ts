import { useState, useRef, useCallback, useEffect } from 'react'
import { requestMicrophoneAccess, createAudioContext, stopMediaStream } from '@/utils/audio'
import { AUDIO_CONFIG } from '@/constants'

interface UseAudioRecordingReturn {
  isListening: boolean
  audioLevel: number
  startRecording: () => Promise<void>
  stopRecording: () => void
}

export const useAudioRecording = (
  isConnected: boolean,
  onAudioChunk: (chunk: ArrayBuffer) => void
): UseAudioRecordingReturn => {
  const [isListening, setIsListening] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const isListeningRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const pendingFloatDataRef = useRef<Float32Array | null>(null)
  const sourceSampleRateRef = useRef<number>(AUDIO_CONFIG.sampleRate)

  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current && isListeningRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      setAudioLevel(average / 255)
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
    } else {
      // Stop the animation if not recording
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isListening])

  const startRecording = useCallback(async () => {
    console.log('startRecording called - isConnected:', isConnected, 'isListening:', isListening)
    
    if (!isConnected) {
      console.warn('Cannot start recording: not connected')
      throw new Error('Not connected to server. Please connect first.')
    }
    
    if (isListeningRef.current) {
      console.warn('Already listening, ignoring start request')
      return
    }

    try {
      console.log('Requesting microphone access...')
      const stream = await requestMicrophoneAccess()
      console.log('Microphone access granted, stream:', stream)
      streamRef.current = stream

      console.log('Creating audio context...')
      const audioContext = createAudioContext()
      audioContextRef.current = audioContext
      sourceSampleRateRef.current = audioContext.sampleRate
      await audioContext.resume()
      pendingFloatDataRef.current = null

      analyserRef.current = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      sourceNodeRef.current = source
      source.connect(analyserRef.current)
      console.log('Audio context created and connected')

      console.log('Creating PCM converter...')
      const processor = audioContext.createScriptProcessor(
        AUDIO_CONFIG.bufferSize,
        AUDIO_CONFIG.channelCount,
        AUDIO_CONFIG.channelCount
      )
      processorRef.current = processor

      const gainNode = audioContext.createGain()
      gainNode.gain.value = 0
      gainNodeRef.current = gainNode

      processor.connect(gainNode)
      gainNode.connect(audioContext.destination)
      source.connect(processor)
      console.log('PCM converter ready')

      processor.onaudioprocess = (event) => {
        if (!isListeningRef.current) {
          return
        }

        const channelData = event.inputBuffer.getChannelData(0)
        if (!channelData) {
          return
        }

        // Copy data because buffers are reused by the browser
        const floatCopy = new Float32Array(channelData.length)
        floatCopy.set(channelData)

        const combined = combineFloat32(
          pendingFloatDataRef.current,
          floatCopy
        )

        const { pcmChunk, remainder } = downsampleToPCM16(
          combined,
          sourceSampleRateRef.current,
          AUDIO_CONFIG.sampleRate
        )

        pendingFloatDataRef.current = remainder

        if (pcmChunk) {
          try {
            onAudioChunk(pcmChunk.buffer as ArrayBuffer)
          } catch (error) {
            console.error('Error sending audio chunk:', error)
          }
        }
      }

      isListeningRef.current = true
      setIsListening(true)
      updateAudioLevel()
    } catch (error) {
      console.error('Error starting audio recording:', error)
      isListeningRef.current = false
      setIsListening(false)
      throw error
    }
  }, [isConnected, isListening, onAudioChunk, updateAudioLevel])

  const stopRecording = useCallback(() => {
    if (isListeningRef.current) {
      console.log('Stopping audio pipeline...')
    }
    isListeningRef.current = false

    if (streamRef.current) {
      stopMediaStream(streamRef.current)
      streamRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current.onaudioprocess = null
      processorRef.current = null
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect()
      gainNodeRef.current = null
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }

    pendingFloatDataRef.current = null

    if (audioContextRef.current) {
      const ctx = audioContextRef.current
      audioContextRef.current = null
      ctx.close().catch(() => {
        console.log('AudioContext already closed')
      })
    }

    if (isListening) {
      setIsListening(false)
      setAudioLevel(0)
      console.log('Recording stopped, state set to false')
    } else {
      setIsListening(false)
      setAudioLevel(0)
    }
  }, [])

  useEffect(() => {
    return () => {
      stopRecording()
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close()
        } catch (error) {
          // AudioContext might already be closed, ignore
          console.log('AudioContext already closed or closing')
        }
      }
    }
  }, [stopRecording])

  return {
    isListening,
    audioLevel,
    startRecording,
    stopRecording,
  }
}

const combineFloat32 = (
  existing: Float32Array | null,
  incoming: Float32Array
): Float32Array => {
  if (!existing || existing.length === 0) {
    return incoming
  }

  const merged = new Float32Array(existing.length + incoming.length)
  merged.set(existing, 0)
  merged.set(incoming, existing.length)
  return merged
}

const downsampleToPCM16 = (
  buffer: Float32Array,
  sourceRate: number,
  targetRate: number
): { pcmChunk: Int16Array | null; remainder: Float32Array | null } => {
  if (!buffer || buffer.length === 0) {
    return { pcmChunk: null, remainder: null }
  }

  if (sourceRate <= targetRate) {
    return {
      pcmChunk: floatTo16BitPCM(buffer),
      remainder: null,
    }
  }

  const sampleRateRatio = sourceRate / targetRate
  if (!isFinite(sampleRateRatio) || sampleRateRatio <= 0) {
    return { pcmChunk: null, remainder: buffer }
  }

  const newLength = Math.floor(buffer.length / sampleRateRatio)
  if (newLength === 0) {
    return { pcmChunk: null, remainder: buffer }
  }

  const downsampledBuffer = new Float32Array(newLength)
  let offsetResult = 0
  let offsetBuffer = 0

  while (offsetResult < downsampledBuffer.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio)
    let accum = 0
    let count = 0

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i]
      count++
    }

    downsampledBuffer[offsetResult] = count > 0 ? accum / count : 0
    offsetResult++
    offsetBuffer = nextOffsetBuffer
  }

  const pcmChunk = floatTo16BitPCM(downsampledBuffer)
  const remainder = buffer.slice(offsetBuffer)

  return {
    pcmChunk,
    remainder: remainder.length ? remainder : null,
  }
}

const floatTo16BitPCM = (input: Float32Array): Int16Array => {
  const output = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i]))
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return output
}
