import { VOICE_COMMANDS } from '@/constants'
import { Calendar } from 'lucide-react'

export const VoiceCommands = () => {
  return (
    <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl shadow-black/20">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-emerald-300" />
        Quick Phrases
      </h3>
      <div className="space-y-3">
        {VOICE_COMMANDS.map((command, index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
          >
            {command}
          </div>
        ))}
      </div>
    </div>
  )
}
