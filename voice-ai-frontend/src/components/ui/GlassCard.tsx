import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export const GlassCard = ({ children, className = '' }: GlassCardProps) => {
  return (
    <div
      className={`bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 shadow-2xl ${className}`}
    >
      {children}
    </div>
  )
}

