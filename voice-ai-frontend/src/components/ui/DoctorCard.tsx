import { Doctor } from '@/types'
import { Users } from 'lucide-react'

interface DoctorCardProps {
  doctor: Doctor
}

export const DoctorCard = ({ doctor }: DoctorCardProps) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400/30 to-cyan-500/30 flex items-center justify-center">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h4 className="font-semibold text-white">{doctor.name}</h4>
          <p className="text-white/70 text-sm">{doctor.specialty}</p>
        </div>
      </div>
    </div>
  )
}
