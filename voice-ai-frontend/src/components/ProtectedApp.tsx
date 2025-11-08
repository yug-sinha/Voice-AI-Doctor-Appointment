'use client'

import { FormEvent, useEffect, useState } from 'react'
import VoiceAssistant from './VoiceAssistant'

type AuthStatus = 'loading' | 'authorized' | 'unauthorized' | 'error'

const ProtectedApp = () => {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/protect/check', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to verify session')
        }
        const data = await response.json()
        setStatus(data.authorized ? 'authorized' : 'unauthorized')
      } catch (error) {
        console.error(error)
        setStatus('error')
        setMessage('Unable to verify access. Please refresh the page.')
      }
    }

    checkSession()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')

    try {
      const response = await fetch('/api/protect/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMessage = data?.message || 'Invalid password. Please try again.'
        setMessage(errorMessage)
        setStatus('unauthorized')
        return
      }

      setPassword('')
      setStatus('authorized')
    } catch (error) {
      console.error(error)
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  if (status === 'authorized') {
    return <VoiceAssistant />
  }

  const isLoading = status === 'loading'

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-white shadow-2xl shadow-emerald-500/10">
        <div className="space-y-2 text-center mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Access Required</p>
          <h1 className="text-3xl font-semibold">Hospital Voice Concierge</h1>
          <p className="text-white/70 text-sm">
            Please enter the access password provided by the administrator to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-white/70">
            Access Password
            <input
              type="password"
              className="mt-2 w-full rounded-2xl bg-slate-900/70 border border-white/10 px-4 py-3 focus:outline-none focus:border-emerald-400 transition"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
              placeholder="Enter password"
              required
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-900 font-semibold py-3 shadow-lg shadow-emerald-500/30 hover:opacity-90 transition disabled:opacity-60"
          >
            {isLoading ? 'Verifying...' : 'Unlock Receptionist'}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-rose-300 text-center">{message}</p>}
      </div>
    </div>
  )
}

export default ProtectedApp
