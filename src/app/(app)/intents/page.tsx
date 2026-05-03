'use client'

import { useRouter } from 'next/navigation'
import { useIntentsMine } from '@/lib/intent-queries'
import { getCategoryLabel } from '@/lib/intent-categories'
import { getStatusDisplay } from '@/lib/intent-status'

interface IntentCardProps {
  id: string
  title: string
  category: string
  side: 'buy' | 'sell'
  reservationPrice: number
  idealPrice: number
  status: string
  expiresAt: string
}

function IntentCard({
  id,
  title,
  category,
  side,
  reservationPrice,
  idealPrice,
  status,
  expiresAt,
}: IntentCardProps) {
  const router = useRouter()
  const statusDisplay = getStatusDisplay(status)
  const categoryLabel = getCategoryLabel(category)

  return (
    <button
      onClick={() => router.push(`/intents/${id}/edit`)}
      className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-blue-400 hover:shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{categoryLabel}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusDisplay.badgeColorClass}`}
        >
          {statusDisplay.labelIt}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <div>
          <span className="text-gray-500">{side === 'buy' ? 'Compro' : 'Vendo'}</span>
          {' · '}
          <span className="font-medium">
            €{idealPrice} <span className="text-gray-500">(min €{reservationPrice})</span>
          </span>
        </div>
        <span className="text-xs text-gray-400">
          Scade: {new Date(expiresAt).toLocaleDateString('it-IT')}
        </span>
      </div>
    </button>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <h2 className="text-xl font-semibold">Nessun intent ancora</h2>

      <p className="mt-3 text-gray-600">
        Crea il tuo primo intent per dire al tuo agente cosa cercare.
      </p>

      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-left text-sm">
        <p className="font-semibold">Esempi:</p>
        <ul className="mt-2 space-y-1 text-gray-700">
          <li>· Compro: bici elettrica usata, max €500</li>
          <li>· Vendo: violino classico, target €800</li>
          <li>· Compro: laptop gaming refurbished, max €1200</li>
        </ul>
      </div>

      <button
        onClick={onCreate}
        className="mt-8 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
      >
        Crea il tuo primo intent
      </button>
    </div>
  )
}

export default function IntentsListPage() {
  const router = useRouter()
  const { data, isLoading, error } = useIntentsMine()

  const handleCreate = () => {
    router.push('/intents/new')
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Caricamento...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">Errore caricamento intent. Ricarica la pagina.</p>
      </div>
    )
  }

  const intents = data?.intents ?? []

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">I tuoi intent</h1>
        {intents.length > 0 && (
          <button
            onClick={handleCreate}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            + Nuovo intent
          </button>
        )}
      </div>

      <div className="mt-6">
        {intents.length === 0 ? (
          <EmptyState onCreate={handleCreate} />
        ) : (
          <div className="space-y-3">
            {intents.map((intent) => (
              <IntentCard
                key={intent.intent_id}
                id={intent.intent_id}
                title={intent.title}
                category={intent.category}
                side={intent.side as 'buy' | 'sell'}
                reservationPrice={intent.reservation_price_eur}
                idealPrice={intent.ideal_price_eur}
                status={intent.status}
                expiresAt={intent.expires_at}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
