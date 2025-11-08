import { Doctor } from '@/types'

export const DEFAULT_BACKEND_URL = 'ws://localhost:8000'

export const DOCTORS: Doctor[] = [
  { id: '1', name: 'Dr. John Smith', specialty: 'Cardiology', color: 'from-red-500 to-pink-500' },
  { id: '2', name: 'Dr. Sarah Lee', specialty: 'Dermatology', color: 'from-green-500 to-emerald-500' },
  { id: '3', name: 'Dr. Michael Johnson', specialty: 'Orthopedics', color: 'from-blue-500 to-cyan-500' },
  { id: '4', name: 'Dr. Aisha Khan', specialty: 'Pediatrics', color: 'from-orange-500 to-amber-500' },
  { id: '5', name: 'Dr. Carlos Martinez', specialty: 'Neurology', color: 'from-purple-500 to-fuchsia-500' },
  { id: '6', name: 'Dr. Emily Oliver', specialty: 'Ophthalmology', color: 'from-indigo-500 to-sky-500' },
  { id: '7', name: 'Dr. Marcus Brown', specialty: 'General Surgery', color: 'from-rose-500 to-red-500' },
  { id: '8', name: 'Dr. Priya Williams', specialty: 'ENT', color: 'from-lime-500 to-green-500' },
]

export const VOICE_COMMANDS = [
  '📅 "Book appointment with Dr. Smith"',
  '🔍 "What doctors are available?"',
  '⏰ "Show Dr. Lee\'s schedule"',
  '❌ "Cancel my appointment"',
  '📋 "List all appointments"',
]

export const AUDIO_CONFIG = {
  sampleRate: 16000,
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  bufferSize: 4096,
}
