'use client'

import { useEffect } from 'react'
import Link from 'next/link'
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
            Account tier {user.tier}. Gestisci intent, match e negoziazioni agentiche.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/intents"
            className="rounded-lg border border-slate-200 bg-white p-4 text-sm hover:border-blue-400"
          >
            <p className="font-semibold text-slate-950">Intent</p>
            <p className="mt-1 text-slate-600">Crea e modifica cosa comprare o vendere.</p>
          </Link>
          <Link
            href="/matches"
            className="rounded-lg border border-slate-200 bg-white p-4 text-sm hover:border-blue-400"
          >
            <p className="font-semibold text-slate-950">Match</p>
            <p className="mt-1 text-slate-600">Consulta opportunità trovate dagli agenti.</p>
          </Link>
          <Link
            href="/negotiations"
            className="rounded-lg border border-slate-200 bg-white p-4 text-sm hover:border-blue-400"
          >
            <p className="font-semibold text-slate-950">Negoziati</p>
            <p className="mt-1 text-slate-600">Leggi i transcript delle offerte.</p>
          </Link>
          <Link
            href="/deals"
            className="rounded-lg border border-slate-200 bg-white p-4 text-sm hover:border-blue-400"
          >
            <p className="font-semibold text-slate-950">Deal</p>
            <p className="mt-1 text-slate-600">Firma accordi pending con passkey.</p>
          </Link>
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
