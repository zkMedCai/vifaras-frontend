'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getLoginErrorMessage } from '@/lib/auth-errors'
import { useAuthStore } from '@/lib/auth-store'
import { loginWithPasskey } from '@/lib/webauthn'

type FormState = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string }

export function LoginForm() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>({ status: 'idle' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState({ status: 'loading' })

    try {
      const result = await loginWithPasskey(email)
      setAuth({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      })
      router.push('/dashboard')
    } catch (err) {
      setState({ status: 'error', message: getLoginErrorMessage(err) })
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
        {isLoading ? 'Authenticating...' : 'Sign in with passkey'}
      </button>

      <p className="text-xs text-slate-500">
        Windows Hello will ask you to authenticate with PIN, fingerprint, or face.
      </p>
    </form>
  )
}
