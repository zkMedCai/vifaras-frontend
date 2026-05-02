'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { useAuthHydrated } from '@/lib/use-auth-hydrated'

export default function DashboardPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const logout = useAuthStore((s) => s.logout)
  const hydrated = useAuthHydrated()

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.push('/login')
    }
  }, [hydrated, accessToken, router])

  if (!hydrated || !accessToken || !user) {
    return null
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Hello {user.email}</h1>
          <p className="mt-2 text-slate-600">
            Tier 0 account. Verify your identity to unlock more features.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">Account</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="text-slate-600">Email:</dt>
              <dd className="font-mono">{user.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-600">User ID:</dt>
              <dd className="font-mono text-xs">{user.id}</dd>
            </div>
          </dl>
        </div>

        <button
          onClick={() => {
            logout()
            router.push('/')
          }}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
        >
          Logout
        </button>
      </div>
    </main>
  )
}
