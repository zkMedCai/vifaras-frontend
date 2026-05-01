'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/lib/auth-store'
import { registerNewPasskey } from '@/lib/webauthn'

type FormState = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string }

export function SignupForm() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>({ status: 'idle' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState({ status: 'loading' })

    try {
      const result = await registerNewPasskey(email)
      setAuth({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      })
      router.push('/dashboard')
    } catch (err) {
      setState({ status: 'error', message: getErrorMessage(err) })
    }
  }

  const isLoading = state.status === 'loading'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full rounded-md border border-slate-300 px-4 py-2 disabled:opacity-50"
          disabled={isLoading}
        />
      </div>

      {state.status === 'error' && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{state.message}</div>
      )}

      <button
        type="submit"
        disabled={isLoading || !email}
        className="w-full rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {isLoading ? 'Creating passkey...' : 'Create passkey'}
      </button>

      <p className="text-xs text-slate-500">
        Windows Hello will ask you to authenticate with PIN, fingerprint, or face.
      </p>
    </form>
  )
}

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.statusCode === 409) {
      return 'An account with this email already exists. Try logging in instead.'
    }
    if (err.statusCode === 422) {
      return 'Please check your email format and try again.'
    }
    if (err.statusCode === 429) {
      return 'Too many attempts. Please wait a moment and try again.'
    }
    if (err.statusCode >= 500) {
      return 'Backend error. Please try again in a moment.'
    }
    return `Signup failed (${err.statusCode}). Please try again.`
  }

  if (err instanceof Error) {
    if (err.name === 'NotAllowedError') {
      return 'Passkey creation was canceled or timed out.'
    }
    if (err.name === 'InvalidStateError') {
      return 'A passkey for this account already exists on this device.'
    }
    if (err.name === 'NotSupportedError') {
      return 'Your browser does not support passkeys. Please use a modern browser.'
    }
    if (err.message === 'Failed to fetch') {
      return 'Cannot reach the backend. Please check your connection.'
    }
  }

  return 'Signup failed. Please try again.'
}
