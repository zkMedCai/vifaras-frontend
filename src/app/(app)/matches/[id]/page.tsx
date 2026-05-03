'use client'

import { useParams, useRouter } from 'next/navigation'
import { useMatchDetail } from '@/lib/match-queries'
import { getCategoryLabel } from '@/lib/intent-categories'
import {
  formatDateTime,
  formatEuro,
  formatScore,
  formatSide,
  formatStatus,
  statusBadgeClass,
} from '@/lib/marketplace-format'
import type { MatchDetailResponse } from '@/lib/api-client'

type MatchIntent = MatchDetailResponse['buy_intent']

function IntentPanel({ intent, label }: { intent: MatchIntent; label: string }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
            intent.status,
          )}`}
        >
          {formatStatus(intent.status)}
        </span>
      </div>
      <h2 className="mt-3 text-lg font-semibold text-gray-950">{intent.title}</h2>
      <p className="mt-1 text-sm text-gray-600">
        {formatSide(intent.side)} · {getCategoryLabel(intent.category)}
      </p>

      {intent.description && <p className="mt-4 text-sm text-gray-700">{intent.description}</p>}

      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500">Prezzo ideale</dt>
          <dd className="mt-1 font-semibold">{formatEuro(intent.ideal_price_eur)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Riserva</dt>
          <dd className="mt-1 font-semibold">{formatEuro(intent.reservation_price_eur)}</dd>
        </div>
      </dl>
    </section>
  )
}

export default function MatchDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const matchId = params.id
  const { data, isLoading, error } = useMatchDetail(matchId)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-gray-600">Caricamento match...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-red-600">Match non disponibile o permessi insufficienti.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <button onClick={() => router.push('/matches')} className="text-sm text-blue-700">
        Indietro ai match
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Dettaglio match</h1>
          <p className="mt-2 text-sm text-gray-600">
            Scoperto {formatDateTime(data.discovered_at)} · stato {formatStatus(data.status)}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 rounded-lg border border-gray-200 bg-white p-4 text-center text-sm">
          <div>
            <p className="text-xs text-gray-500">Score</p>
            <p className="font-semibold">{formatScore(data.scores.combined)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Prezzo</p>
            <p className="font-semibold">{formatScore(data.scores.price_proximity)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Similarità</p>
            <p className="font-semibold">{formatScore(data.scores.similarity)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <IntentPanel intent={data.buy_intent} label="Intent compratore" />
        <IntentPanel intent={data.sell_intent} label="Intent venditore" />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => router.push('/negotiations')}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Vedi negoziazioni
        </button>
      </div>
    </div>
  )
}
