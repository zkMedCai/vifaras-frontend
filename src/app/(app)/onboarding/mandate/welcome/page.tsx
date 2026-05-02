'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMandateStore } from '@/lib/mandate-store'
import { useFirstPendingMandateAgent } from '@/lib/agent-queries'
import { getNextStep } from '@/lib/mandate-steps'

export default function MandateWelcomePage() {
  const router = useRouter()
  const reset = useMandateStore((s) => s.reset)
  const setAgentId = useMandateStore((s) => s.setAgentId)

  const { agent, isLoading, error } = useFirstPendingMandateAgent()

  useEffect(() => {
    reset()
  }, [reset])

  useEffect(() => {
    if (agent) {
      setAgentId(agent.id)
    }
  }, [agent, setAgentId])

  const handleStart = () => {
    const nextStep = getNextStep('welcome')
    if (nextStep) {
      router.push(`/onboarding/mandate/${nextStep}`)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-gray-600">Caricamento...</p>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-bold text-red-600">Agente non trovato</h1>
        <p className="mt-2 text-gray-700">Il tuo agente non è disponibile. Contatta il supporto.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">Configura il tuo agente</h1>

      <p className="mt-4 text-lg text-gray-700">
        Stai per autorizzare il tuo agente AI a negoziare per tuo conto. Definirai i limiti
        finanziari e operativi del mandato.
      </p>

      <p className="mt-4 text-gray-600">
        L&apos;agente firmerà ogni deal con la tua autorizzazione biometrica. Tu mantieni sempre il
        controllo finale.
      </p>

      <button
        onClick={handleStart}
        className="mt-8 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
      >
        Inizia
      </button>
    </div>
  )
}
