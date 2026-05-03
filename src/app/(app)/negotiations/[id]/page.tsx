'use client'

import { useParams, useRouter } from 'next/navigation'
import { useNegotiation } from '@/lib/negotiation-queries'
import {
  formatDateTime,
  formatEuroCents,
  formatStatus,
  formatTurnType,
  statusBadgeClass,
} from '@/lib/marketplace-format'
import type { NegotiationStateResponse } from '@/lib/api-client'

type Turn = NegotiationStateResponse['turns'][number]

function TurnItem({ turn }: { turn: Turn }) {
  const isTerminal = turn.type === 'accept' || turn.type === 'reject'

  return (
    <li className="relative pl-8">
      <span
        className={`absolute left-0 top-1 h-3 w-3 rounded-full ${
          isTerminal ? 'bg-emerald-500' : 'bg-blue-500'
        }`}
      />
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-950">
              #{turn.turn_number} · {formatTurnType(turn.type)}
            </p>
            <p className="mt-1 font-mono text-xs text-gray-500">
              Agente {turn.agent_id.slice(0, 8)}
            </p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="font-semibold">{formatEuroCents(turn.price_cents)}</p>
            <p className="text-xs text-gray-500">{formatDateTime(turn.timestamp)}</p>
          </div>
        </div>
        {turn.message && <p className="mt-3 text-sm text-gray-700">{turn.message}</p>}
      </div>
    </li>
  )
}

export default function NegotiationDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const negotiationId = params.id
  const { data, isLoading, error } = useNegotiation(negotiationId)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-gray-600">Caricamento transcript...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-red-600">Negoziazione non disponibile o permessi insufficienti.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <button onClick={() => router.push('/negotiations')} className="text-sm text-blue-700">
        Indietro ai negoziati
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                data.status,
              )}`}
            >
              {formatStatus(data.status)}
            </span>
            {data.is_final_round && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                Round finale
              </span>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-950">Transcript negoziazione</h1>
          <p className="mt-2 text-sm text-gray-600">
            Match {data.match_id.slice(0, 8)} · avviata {formatDateTime(data.started_at)}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <div>
            <dt className="text-gray-500">Round</dt>
            <dd className="mt-1 font-semibold">
              {data.rounds_used}/{data.max_rounds}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Prezzo finale</dt>
            <dd className="mt-1 font-semibold">
              {data.agreed_price_cents ? formatEuroCents(data.agreed_price_cents) : 'N/D'}
            </dd>
          </div>
        </dl>
      </div>

      {data.turns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">Transcript vuoto</h2>
          <p className="mt-2 text-sm text-gray-600">Non ci sono ancora turni registrati.</p>
        </div>
      ) : (
        <ol className="space-y-4 border-l border-gray-200 pl-4">
          {data.turns.map((turn) => (
            <TurnItem key={`${turn.turn_number}-${turn.type}`} turn={turn} />
          ))}
        </ol>
      )}
    </div>
  )
}
