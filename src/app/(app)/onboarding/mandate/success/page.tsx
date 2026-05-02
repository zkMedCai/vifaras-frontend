'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMandateStore } from '@/lib/mandate-store'

export default function MandateSuccessPage() {
  const router = useRouter()
  const reset = useMandateStore((s) => s.reset)

  useEffect(() => {
    reset()
  }, [reset])

  const handleContinue = () => {
    router.push('/dashboard')
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-10 w-10 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="mt-6 text-3xl font-bold">Mandato attivo</h1>

        <p className="mt-4 text-lg text-gray-700">
          Il tuo agente AI è ora autorizzato a negoziare per tuo conto.
        </p>

        <p className="mt-2 text-gray-600">Inizierà a cercare opportunità entro pochi minuti.</p>

        <button
          onClick={handleContinue}
          className="mt-8 rounded-lg bg-blue-600 px-8 py-3 text-white hover:bg-blue-700"
        >
          Vai alla home
        </button>
      </div>
    </div>
  )
}
