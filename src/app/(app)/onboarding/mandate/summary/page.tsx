'use client'

import { useRouter } from 'next/navigation'
import { useMandateStore } from '@/lib/mandate-store'
import { useCreateDraft } from '@/lib/mandate-queries'
import { getNextStep, getPrevStep } from '@/lib/mandate-steps'

export default function MandateSummaryPage() {
  const router = useRouter()
  const config = useMandateStore()
  const setDraftResponse = useMandateStore((s) => s.setDraftResponse)
  const createDraft = useCreateDraft()

  const handleConfirm = async () => {
    if (!config.agentId) {
      console.error('Cannot create draft: agentId is null')
      return
    }

    try {
      const response = await createDraft.mutateAsync({
        agent_id: config.agentId,
        limits: {
          max_price_per_deal_eur: config.maxPricePerDealEur,
          max_total_volume_eur_per_mandate: config.maxTotalVolumeEur,
          max_deals_per_day: config.maxDealsPerDay,
        },
        constraints: {
          geo_scope: config.geoScope,
        },
      })

      // payload_summary is nested {human_readable, key_fields[]} — store keeps
      // only the human_readable string for the S3 sign screen preview.
      const summary = response.payload_summary as { human_readable: string }
      setDraftResponse({
        draft_id: response.draft_id,
        challenge: response.challenge,
        payload_summary: summary.human_readable,
      })

      const next = getNextStep('summary')
      if (next) router.push(`/onboarding/mandate/${next}`)
    } catch (err) {
      console.error('Draft creation failed:', err)
    }
  }

  const handlePrev = () => {
    const prev = getPrevStep('summary')
    if (prev) router.push(`/onboarding/mandate/${prev}`)
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h2 className="text-2xl font-bold">Riepilogo</h2>

      <div className="mt-6 space-y-3 rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex justify-between">
          <span className="text-gray-600">Limite per deal</span>
          <span className="font-semibold">€{config.maxPricePerDealEur}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Budget mensile</span>
          <span className="font-semibold">€{config.maxTotalVolumeEur}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Deal al giorno</span>
          <span className="font-semibold">{config.maxDealsPerDay}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Area geografica</span>
          <span className="font-semibold">Italia</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Durata</span>
          <span className="font-semibold">30 giorni</span>
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-600">
        Cliccando &quot;Conferma&quot; verrà creata una bozza del mandato. Il prossimo passo sarà la
        firma biometrica.
      </p>

      <div className="mt-8 flex justify-between">
        <button
          onClick={handlePrev}
          disabled={createDraft.isPending}
          className="rounded-lg border border-gray-300 px-6 py-3 hover:bg-gray-50 disabled:opacity-50"
        >
          Indietro
        </button>
        <button
          onClick={handleConfirm}
          disabled={createDraft.isPending || !config.agentId}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {createDraft.isPending ? 'Creazione...' : 'Conferma'}
        </button>
      </div>
    </div>
  )
}
