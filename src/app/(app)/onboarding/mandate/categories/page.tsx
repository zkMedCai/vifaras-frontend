'use client'

import { useRouter } from 'next/navigation'
import { getNextStep, getPrevStep } from '@/lib/mandate-steps'

export default function MandateCategoriesPage() {
  const router = useRouter()

  const handleNext = () => {
    const next = getNextStep('categories')
    if (next) router.push(`/onboarding/mandate/${next}`)
  }

  const handlePrev = () => {
    const prev = getPrevStep('categories')
    if (prev) router.push(`/onboarding/mandate/${prev}`)
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h2 className="text-xl font-semibold">Categorie e area geografica</h2>

      <div className="mt-6 space-y-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="font-semibold">Categorie</h3>
          <p className="mt-2 text-sm text-gray-700">
            Per V0 il tuo agente può cercare in tutte le categorie supportate dalla piattaforma,
            eccetto quelle riservate (alcol, armi, sostanze regolamentate).
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="font-semibold">Area geografica</h3>
          <p className="mt-2 text-sm text-gray-700">L&apos;agente opererà in Italia.</p>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={handlePrev}
          className="rounded-lg border border-gray-300 px-6 py-3 hover:bg-gray-50"
        >
          Indietro
        </button>
        <button
          onClick={handleNext}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Avanti
        </button>
      </div>
    </div>
  )
}
