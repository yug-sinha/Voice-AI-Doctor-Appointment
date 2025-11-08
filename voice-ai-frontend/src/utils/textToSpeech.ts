/**
 * Text-to-Speech utility using Web Speech Synthesis API
 * Converts text responses to speech
 */

interface TextToSpeechOptions {
  rate?: number // 0.1 to 10, default 1
  pitch?: number // 0 to 2, default 1
  volume?: number // 0 to 1, default 1
  voice?: SpeechSynthesisVoice
  lang?: string
}

export const speakText = (
  text: string,
  options: TextToSpeechOptions = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser')
      reject(new Error('Speech synthesis not supported'))
      return
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    
    // Set options
    utterance.rate = options.rate ?? 0.9 // Slightly slower for clarity
    utterance.pitch = options.pitch ?? 1
    utterance.volume = options.volume ?? 1
    utterance.lang = options.lang ?? 'en-US'

    // Try to use a natural-sounding voice
    if (options.voice) {
      utterance.voice = options.voice
    } else {
      const voices = window.speechSynthesis.getVoices()
      // Prefer female voices (often sound more natural for assistants)
      const preferredVoice = voices.find(
        (v) => v.lang.startsWith('en') && v.name.includes('Female')
      ) || voices.find((v) => v.lang.startsWith('en'))
      
      if (preferredVoice) {
        utterance.voice = preferredVoice
      }
    }

    utterance.onend = () => {
      console.log('Speech synthesis completed')
      resolve()
    }

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event)
      reject(event.error)
    }

    console.log('Speaking text:', text.substring(0, 50) + '...')
    window.speechSynthesis.speak(utterance)
  })
}

export const stopSpeaking = (): void => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

export const isSpeaking = (): boolean => {
  if (!('speechSynthesis' in window)) {
    return false
  }
  return window.speechSynthesis.speaking
}

export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
  if (!('speechSynthesis' in window)) {
    return []
  }
  return window.speechSynthesis.getVoices()
}

