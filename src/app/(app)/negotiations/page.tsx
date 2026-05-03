'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNegotiations } from '@/lib/negotiation-queries'
import { formatDateTime, formatStatus, statusBadgeClass } from '@/lib/marketplace-format'
import type { NegotiationListResponse } from '@/lib/api-client'

type NegotiationItem = NegotiationListResponse['negotiations'][number]

const FILTERS = [
  { label: 'Tutte', value: undefined },
  { label: 'Attive', value: 'active' },
  { label: 'Accettate', value: 'agreed' },
  { label: 'Rifiutate', value: 'rejected' },
  { label: 'Annullate', value: 'cancelled' },
] as const

function NegotiationCard({ negotiation }: { negotiation: NegotiationItem }) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push(`/negotiations/${negotiation.negotiation_id}`)}
      className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                negotiation.status,
              )}`}
            >
              {formatStatus(negotiation.status)}
            </span>
            <span className="text-xs text-gray-500">
              Avviata {formatDateTime(negotiation.started_at)}
            </span>
          </div>
          <p className="mt-3 font-mono text-xs text-gray-500">
            Match {negotiation.match_id.slice(0, 8)}
          </p>
          <h3 className="mt-1 text-base font-semibold text-gray-950">
            Negoziazione {negotiation.negotiation_id.slice(0, 8)}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm sm:min-w-48 sm:text-right">
          <div>
            <p className="text-xs text-gray-500">Round</p>
            <p className="font-semibold">
              {negotiation.rounds_used}/{negotiation.max_rounds}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Chiusura</p>
            <p className="font-semibold">
              {negotiation.closed_at ? formatDateTime(negotiation.closed_at) : 'Aperta'}
            </p>
          </div>
        </div>
      </div>
    </button>
  )
}

export default function NegotiationsPage() {
  const [status, setStatus] = useState<string | undefined>(undefined)
  const params = useMemo(() => ({ status, limit: 30 }), [status])
  const { data, isLoading, error } = useNegotiations(params)
  const negotiations = data?.negotiations ?? []

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-gray-600">Caricamento negoziazioni...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-red-600">Errore caricamento negoziazioni. Ricarica la pagina.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Negoziati</h1>
        <p className="mt-2 text-sm text-gray-600">
          Transcript read-only delle offerte generate dagli agenti.
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

      {negotiations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">Nessuna negoziazione</h2>
          <p className="mt-2 text-sm text-gray-600">
            Quando un agente apre una trattativa, il transcript comparirà qui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {negotiations.map((negotiation) => (
            <NegotiationCard key={negotiation.negotiation_id} negotiation={negotiation} />
          ))}
        </div>
      )}
    </div>
  )
}
