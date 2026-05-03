'use client'

import { useRouter } from 'next/navigation'
import { useIntentMatches } from '@/lib/match-queries'
import { useIntentsMine } from '@/lib/intent-queries'
import { getCategoryLabel } from '@/lib/intent-categories'
import {
  formatDateTime,
  formatEuro,
  formatScore,
  formatSide,
  formatStatus,
  statusBadgeClass,
} from '@/lib/marketplace-format'
import type { IntentListResponse, MatchListResponse } from '@/lib/api-client'

type IntentItem = IntentListResponse['intents'][number]
type MatchItem = MatchListResponse['matches'][number]

function MatchCard({ match }: { match: MatchItem }) {
  const router = useRouter()
  const counterparty = match.counterparty_intent

  return (
    <button
      onClick={() => router.push(`/matches/${match.match_id}`)}
      className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                match.status,
              )}`}
            >
              {formatStatus(match.status)}
            </span>
            <span className="text-xs text-gray-500">{formatDateTime(match.discovered_at)}</span>
          </div>
          <h3 className="mt-3 text-base font-semibold text-gray-950">{counterparty.title}</h3>
          <p className="mt-1 text-sm text-gray-600">
            {formatSide(counterparty.side)} · {getCategoryLabel(counterparty.category)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-right text-sm sm:min-w-72">
          <div>
            <p className="text-xs text-gray-500">Score</p>
            <p className="font-semibold">{formatScore(match.scores.combined)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Prezzo</p>
            <p className="font-semibold">{formatEuro(counterparty.reservation_price_eur)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Similarità</p>
            <p className="font-semibold">{formatScore(match.scores.similarity)}</p>
          </div>
        </div>
      </div>
    </button>
  )
}

function IntentMatchGroup({ intent }: { intent: IntentItem }) {
  const { data, isLoading, error } = useIntentMatches(intent.intent_id, { limit: 5 })
  const matches = data?.matches ?? []

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {formatSide(intent.side)} · {getCategoryLabel(intent.category)}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-gray-950">{intent.title}</h2>
        </div>
        <p className="text-sm text-gray-500">
          Target {formatEuro(intent.ideal_price_eur)} · riserva{' '}
          {formatEuro(intent.reservation_price_eur)}
        </p>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Caricamento match...</p>}

      {error && <p className="text-sm text-red-600">Errore caricamento match per questo intent.</p>}

      {!isLoading && !error && matches.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
          Nessun match disponibile per questo intent.
        </div>
      )}

      {matches.length > 0 && (
        <div className="space-y-3">
          {matches.map((match) => (
            <MatchCard key={match.match_id} match={match} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function MatchesPage() {
  const router = useRouter()
  const { data, isLoading, error } = useIntentsMine({ limit: 20 })
  const intents = (data?.intents ?? []).filter((intent) => intent.status !== 'cancelled')

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-gray-600">Caricamento match...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-red-600">Errore caricamento match. Ricarica la pagina.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Match trovati</h1>
          <p className="mt-2 text-sm text-gray-600">
            Opportunità scoperte dagli intent attivi. La lista è read-only in questa fase.
          </p>
        </div>
        <button
          onClick={() => router.push('/intents/new')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nuovo intent
        </button>
      </div>

      {intents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">Nessun intent da monitorare</h2>
          <p className="mt-2 text-sm text-gray-600">
            Crea un intent attivo per iniziare a vedere i match.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {intents.map((intent) => (
            <IntentMatchGroup key={intent.intent_id} intent={intent} />
          ))}
        </div>
      )}
    </div>
  )
}
