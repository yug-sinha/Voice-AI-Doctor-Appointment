import { AUDIO_CONFIG } from '@/constants'

export const requestMicrophoneAccess = async (): Promise<MediaStream> => {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: AUDIO_CONFIG.sampleRate,
      channelCount: AUDIO_CONFIG.channelCount,
      echoCancellation: AUDIO_CONFIG.echoCancellation,
      noiseSuppression: AUDIO_CONFIG.noiseSuppression,
    },
  })
}

export const createAudioContext = (): AudioContext => {
  return new AudioContext({ sampleRate: AUDIO_CONFIG.sampleRate })
}

export const playAudioBlob = async (
  audioBlob: Blob,
  audioContext: AudioContext
): Promise<void> => {
  const arrayBuffer = await audioBlob.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  const source = audioContext.createBufferSource()
  source.buffer = audioBuffer
  source.connect(audioContext.destination)
  source.start()

  return new Promise((resolve) => {
    source.onended = () => resolve()
  })
}

export const stopMediaStream = (stream: MediaStream): void => {
  stream.getTracks().forEach((track) => track.stop())
}
