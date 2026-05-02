'use client'

import { useRouter } from 'next/navigation'
import { useMandateStore } from '@/lib/mandate-store'
import { MandateSlider } from '@/components/mandate/MandateSlider'
import { getNextStep, getPrevStep } from '@/lib/mandate-steps'

export default function MandateBudgetPage() {
  const router = useRouter()
  const value = useMandateStore((s) => s.maxTotalVolumeEur)
  const setValue = useMandateStore((s) => s.setMaxTotalVolume)

  const handleNext = () => {
    const next = getNextStep('budget')
    if (next) router.push(`/onboarding/mandate/${next}`)
  }

  const handlePrev = () => {
    const prev = getPrevStep('budget')
    if (prev) router.push(`/onboarding/mandate/${prev}`)
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <MandateSlider
        label="Budget mensile"
        description="Il volume totale che il tuo agente potrà gestire complessivamente nel periodo del mandato."
        value={value}
        onChange={setValue}
        min={50}
        max={5000}
        step={50}
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
