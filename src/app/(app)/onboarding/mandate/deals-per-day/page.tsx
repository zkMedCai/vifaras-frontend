'use client'

import { useRouter } from 'next/navigation'
import { useMandateStore } from '@/lib/mandate-store'
import { MandateSlider } from '@/components/mandate/MandateSlider'
import { getNextStep, getPrevStep } from '@/lib/mandate-steps'

export default function MandateDealsPerDayPage() {
  const router = useRouter()
  const value = useMandateStore((s) => s.maxDealsPerDay)
  const setValue = useMandateStore((s) => s.setMaxDealsPerDay)

  const handleNext = () => {
    const next = getNextStep('deals-per-day')
    if (next) router.push(`/onboarding/mandate/${next}`)
  }

  const handlePrev = () => {
    const prev = getPrevStep('deals-per-day')
    if (prev) router.push(`/onboarding/mandate/${prev}`)
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <MandateSlider
        label="Deal massimi al giorno"
        description="Il numero massimo di deal che il tuo agente potrà completare ogni giorno."
        value={value}
        onChange={setValue}
        min={1}
        max={10}
        step={1}
        unit=""
      />

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
