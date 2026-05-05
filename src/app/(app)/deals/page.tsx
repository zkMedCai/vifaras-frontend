'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDeals } from '@/lib/deal-queries'
import {
  formatDateTime,
  formatEuroCents,
  formatStatus,
  statusBadgeClass,
} from '@/lib/marketplace-format'
import type { DealListResponse } from '@/lib/api-client'

type DealItem = DealListResponse['deals'][number]

const FILTERS = [
  { label: 'Tutti', value: undefined },
  { label: 'Da firmare', value: 'pending_signatures' },
  { label: 'Confermati', value: 'confirmed' },
  { label: 'Annullati', value: 'cancelled' },
  { label: 'Scaduti', value: 'expired' },
] as const

function DealCard({ deal }: { deal: DealItem }) {
  const router = useRouter()
  const isPending = deal.status === 'pending_signatures'

  return (
    <button
      onClick={() => router.push(`/deals/${deal.deal_id}`)}
      className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                deal.status,
              )}`}
            >
              {formatStatus(deal.status)}
            </span>
            {isPending && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                Firma richiesta
              </span>
            )}
          </div>
          <h3 className="mt-3 text-base font-semibold text-gray-950">
            Deal {deal.deal_id.slice(0, 8)}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Creato {formatDateTime(deal.created_at)} · scade {formatDateTime(deal.expires_at)}
          </p>
        </div>

        <div className="text-sm sm:min-w-44 sm:text-right">
          <p className="text-xs text-gray-500">Prezzo concordato</p>
          <p className="mt-1 text-lg font-semibold text-gray-950">
            {formatEuroCents(deal.agreed_price_cents)}
          </p>
          <p className="mt-1 text-xs text-gray-500">{deal.currency}</p>
        </div>
      </div>
    </button>
  )
}

export default function DealsPage() {
  const [status, setStatus] = useState<string | undefined>(undefined)
  const params = useMemo(() => ({ status, limit: 30 }), [status])
  const { data, isLoading, error } = useDeals(params)
  const deals = data?.deals ?? []

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-gray-600">Caricamento deal...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-red-600">Errore caricamento deal. Ricarica la pagina.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Deal</h1>
        <p className="mt-2 text-sm text-gray-600">
          Accordi raggiunti dagli agenti. I deal pending richiedono firma passkey da entrambe le
          parti.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            onClick={() => setStatus(filter.value)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              status === filter.value
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {deals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">Nessun deal</h2>
          <p className="mt-2 text-sm text-gray-600">
            Quando una negoziazione viene accettata, il deal da firmare comparirà qui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => (
            <DealCard key={deal.deal_id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  )
}
