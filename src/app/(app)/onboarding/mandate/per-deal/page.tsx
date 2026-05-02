'use client'

import { useRouter } from 'next/navigation'
import { useMandateStore } from '@/lib/mandate-store'
import { MandateSlider } from '@/components/mandate/MandateSlider'
import { getNextStep, getPrevStep } from '@/lib/mandate-steps'

export default function MandatePerDealPage() {
  const router = useRouter()
  const value = useMandateStore((s) => s.maxPricePerDealEur)
  const setValue = useMandateStore((s) => s.setMaxPricePerDeal)

  const handleNext = () => {
    const next = getNextStep('per-deal')
    if (next) router.push(`/onboarding/mandate/${next}`)
  }

  const handlePrev = () => {
    const prev = getPrevStep('per-deal')
    if (prev) router.push(`/onboarding/mandate/${prev}`)
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <MandateSlider
        label="Limite per singolo deal"
        description="Il valore massimo che il tuo agente potrà spendere o ricevere in un singolo deal."
        value={value}
        onChange={setValue}
        min={20}
        max={1000}
        step={10}
        unit="€"
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
