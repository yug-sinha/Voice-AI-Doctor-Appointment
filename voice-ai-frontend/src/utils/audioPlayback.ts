/**
 * Audio playback utilities for PCM16 audio at 24kHz
 * Handles binary PCM16 audio chunks from the backend
 */

export interface AudioFormat {
  encoding: string
  sample_rate: number
  channels: number
}

/**
 * Play PCM16 audio buffer
 * @param pcm16Buffer - Int16Array of PCM16 samples
 * @param audioContext - Web Audio API AudioContext
 * @param sampleRate - Sample rate (default 24000 from backend)
 */
export const playPCM16Audio = async (
  pcm16Buffer: Int16Array,
  audioContext: AudioContext,
  sampleRate: number = 24000
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Create an AudioBuffer from PCM16 data
      const audioBuffer = audioContext.createBuffer(
        1, // mono
        pcm16Buffer.length,
        sampleRate
      )

      // Convert Int16 PCM to Float32 (-1.0 to 1.0)
      const channelData = audioBuffer.getChannelData(0)
      for (let i = 0; i < pcm16Buffer.length; i++) {
        channelData[i] = pcm16Buffer[i] / 32768.0
      }

      // Create and play the buffer
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      source.onended = () => resolve()
      source.start(0)
    } catch (error) {
      console.error('Error playing PCM16 audio:', error)
      reject(error)
    }
  })
}

/**
 * Queue-based audio player for streaming PCM16 chunks
 */
export class PCM16AudioPlayer {
  private audioContext: AudioContext
  private sampleRate: number
  private queue: Int16Array[] = []
  private isPlaying: boolean = false
  private nextStartTime: number = 0
  private scheduledBuffers: AudioBufferSourceNode[] = []

  constructor(audioContext: AudioContext, sampleRate: number = 24000) {
    this.audioContext = audioContext
    this.sampleRate = sampleRate
  }

  /**
   * Add PCM16 chunk to queue and play if not already playing
   */
  async addChunk(pcm16Data: Int16Array): Promise<void> {
    this.queue.push(pcm16Data)

    if (!this.isPlaying) {
      this.startPlaying()
    }
  }

  /**
   * Start playing queued chunks
   */
  private async startPlaying(): Promise<void> {
    if (this.isPlaying || this.queue.length === 0) {
      return
    }

    this.isPlaying = true

    while (this.queue.length > 0) {
      const chunk = this.queue.shift()!
      await this.playChunk(chunk)
    }

    this.isPlaying = false
  }

  /**
   * Play a single PCM16 chunk
   */
  private async playChunk(pcm16Data: Int16Array): Promise<void> {
    return new Promise((resolve) => {
      try {
        const audioBuffer = this.audioContext.createBuffer(
          1, // mono
          pcm16Data.length,
          this.sampleRate
        )

        const channelData = audioBuffer.getChannelData(0)
        for (let i = 0; i < pcm16Data.length; i++) {
          channelData[i] = pcm16Data[i] / 32768.0
        }

        const source = this.audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(this.audioContext.destination)

        const currentTime = this.audioContext.currentTime
        const startTime = Math.max(currentTime, this.nextStartTime)
        source.start(startTime)

        const duration = audioBuffer.duration
        this.nextStartTime = startTime + duration

        source.onended = () => resolve()

        this.scheduledBuffers.push(source)
      } catch (error) {
        console.error('Error playing PCM16 chunk:', error)
        resolve()
      }
    })
  }

  /**
   * Stop all playback and clear queue
   */
  stop(): void {
    this.queue = []
    this.scheduledBuffers.forEach((source) => {
      try {
        source.stop()
      } catch (e) {
        // Already stopped
      }
    })
    this.scheduledBuffers = []
    this.isPlaying = false
    this.nextStartTime = 0
  }

  /**
   * Check if currently playing
   */
  get playing(): boolean {
    return this.isPlaying
  }
}

