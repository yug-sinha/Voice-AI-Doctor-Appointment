import { DOCTORS } from '@/constants'
import { Users } from 'lucide-react'

interface DoctorsListProps {
  compact?: boolean
}

export const DoctorsList = ({ compact = false }: DoctorsListProps) => {
  const content = DOCTORS.map((doctor) => doctor.name)
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/20 p-4 sm:p-6 ${
        compact ? 'lg:p-5' : ''
      }`}
    >
      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <Users className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-300" />
        Doctors On Duty
      </h3>
      <div className="flex flex-wrap gap-2">
        {content.map((name) => (
          <span
            key={name}
            className="px-2 sm:px-3 py-1 rounded-full border border-white/15 text-xs sm:text-sm text-white/80 bg-white/5 break-words"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}
