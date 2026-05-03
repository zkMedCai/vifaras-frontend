'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useIntentStore } from '@/lib/intent-store'
import { useCreateIntent } from '@/lib/intent-queries'
import { CATEGORY_GROUPS, getCategoriesByGroup } from '@/lib/intent-categories'
import { ApiError } from '@/lib/api-client'

const LOCATION_REGEX = /^[^,]+,\s*[A-Z]{2}$/

interface UxError {
  field: string | null
  message: string
}

function validateClient(state: ReturnType<typeof useIntentStore.getState>): UxError | null {
  if (!state.title.trim()) {
    return { field: 'title', message: 'Il titolo è obbligatorio.' }
  }
  if (state.title.length > 200) {
    return { field: 'title', message: 'Il titolo non può superare 200 caratteri.' }
  }
  if (state.description.length > 2000) {
    return { field: 'description', message: 'La descrizione non può superare 2000 caratteri.' }
  }
  if (!state.category) {
    return { field: 'category', message: 'Seleziona una categoria.' }
  }
  if (!state.side) {
    return { field: 'side', message: 'Indica se vuoi comprare o vendere.' }
  }
  if (state.idealPriceEur <= 0) {
    return { field: 'idealPriceEur', message: 'Il prezzo ideale deve essere maggiore di zero.' }
  }
  if (state.idealPriceEur > 10000) {
    return { field: 'idealPriceEur', message: 'Il prezzo non può superare €10.000.' }
  }
  if (state.reservationPriceEur <= 0) {
    return {
      field: 'reservationPriceEur',
      message: 'Il prezzo minimo accettabile deve essere maggiore di zero.',
    }
  }
  if (
    state.locationCity &&
    !LOCATION_REGEX.test(`${state.locationCity}, ${state.locationCountry}`)
  ) {
    return {
      field: 'locationCity',
      message: 'La città deve essere in formato "Nome città" (es: Roma).',
    }
  }
  return null
}

function mapBackendError(err: unknown): string {
  if (err instanceof ApiError) {
    const code = (err.body as { detail?: { code?: string } })?.detail?.code

    switch (code) {
      case 'invalid_title':
        return 'Titolo non valido (max 200 caratteri, niente HTML o URL).'
      case 'invalid_description':
        return 'Descrizione non valida (max 2000 caratteri, niente HTML o URL).'
      case 'invalid_price':
        return 'Prezzo non valido. Deve essere maggiore di zero.'
      case 'price_exceeds_platform_limit':
        return 'Il prezzo supera il limite della piattaforma (€10.000).'
      case 'category_forbidden':
        return 'Questa categoria non è permessa sulla piattaforma.'
      case 'category_not_allowed':
        return 'Categoria non valida.'
      case 'too_many_active_intents':
        return 'Hai raggiunto il limite di intent attivi. Cancella un intent esistente per crearne uno nuovo.'
      case 'embedding_service_unavailable':
        return 'Servizio non disponibile. Riprova tra qualche istante.'
      default:
        return 'Errore tecnico. Riprova.'
    }
  }
  return 'Errore tecnico. Riprova.'
}

export default function IntentNewPage() {
  const router = useRouter()
  const store = useIntentStore()
  const reset = useIntentStore((s) => s.reset)
  const createIntent = useCreateIntent()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<UxError | null>(null)

  useEffect(() => {
    reset()
  }, [reset])

  const handleSubmit = async () => {
    setSubmitError(null)

    const valError = validateClient(store)
    if (valError) {
      setValidationError(valError)
      return
    }
    setValidationError(null)

    try {
      const hardConstraints = store.locationCity
        ? { location: `${store.locationCity.trim()}, ${store.locationCountry}` }
        : {}

      const description = store.description.trim()

      await createIntent.mutateAsync({
        title: store.title.trim(),
        description: description || null,
        category: store.category,
        side: store.side as 'buy' | 'sell',
        reservation_price_eur: store.reservationPriceEur,
        ideal_price_eur: store.idealPriceEur,
        currency: 'EUR',
        duration_days: store.durationDays,
        hard_constraints: hardConstraints,
      })

      router.push('/intents')
    } catch (err) {
      setSubmitError(mapBackendError(err))
      console.error('Intent creation failed:', err)
    }
  }

  const handleCancel = () => {
    router.push('/intents')
  }

  const grouped = getCategoriesByGroup()

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Crea nuovo intent</h1>

      <div className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium">Titolo</label>
          <input
            type="text"
            value={store.title}
            onChange={(e) => store.setTitle(e.target.value)}
            maxLength={200}
            placeholder="Es: Bici elettrica city usata"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
          {validationError?.field === 'title' && (
            <p className="mt-1 text-sm text-red-600">{validationError.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Vuoi comprare o vendere?</label>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => store.setSide('buy')}
              className={`flex-1 rounded-lg border px-4 py-2 font-medium ${
                store.side === 'buy'
                  ? 'border-blue-600 bg-blue-50 text-blue-800'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              Compro
            </button>
            <button
              type="button"
              onClick={() => store.setSide('sell')}
              className={`flex-1 rounded-lg border px-4 py-2 font-medium ${
                store.side === 'sell'
                  ? 'border-blue-600 bg-blue-50 text-blue-800'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              Vendo
            </button>
          </div>
          {validationError?.field === 'side' && (
            <p className="mt-1 text-sm text-red-600">{validationError.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Categoria</label>
          <select
            value={store.category}
            onChange={(e) => store.setCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Seleziona una categoria...</option>
            {Object.entries(CATEGORY_GROUPS).map(([groupKey, groupLabel]) => (
              <optgroup key={groupKey} label={groupLabel}>
                {grouped[groupKey]?.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.labelIt}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {validationError?.field === 'category' && (
            <p className="mt-1 text-sm text-red-600">{validationError.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">
            Descrizione <span className="text-gray-500">(opzionale)</span>
          </label>
          <textarea
            value={store.description}
            onChange={(e) => store.setDescription(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Aggiungi dettagli (anno, modello, condizioni, etc.)"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">{store.description.length} / 2000 caratteri</p>
          {validationError?.field === 'description' && (
            <p className="mt-1 text-sm text-red-600">{validationError.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Prezzo target (ideale)</label>
          <p className="text-xs text-gray-500">Quanto vorresti idealmente</p>
          <div className="mt-1 flex items-center">
            <span className="rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 py-2 text-gray-600">
              €
            </span>
            <input
              type="number"
              value={store.idealPriceEur || ''}
              onChange={(e) => store.setIdealPrice(Number(e.target.value) || 0)}
              min={1}
              max={10000}
              placeholder="100"
              className="w-full rounded-r-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          {validationError?.field === 'idealPriceEur' && (
            <p className="mt-1 text-sm text-red-600">{validationError.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">
            {store.side === 'sell' ? 'Prezzo minimo accettabile' : 'Prezzo massimo accettabile'}
          </label>
          <p className="text-xs text-gray-500">
            {store.side === 'sell'
              ? "Sotto questo valore l'agente rifiuta automaticamente"
              : "Sopra questo valore l'agente rifiuta automaticamente"}
          </p>
          <div className="mt-1 flex items-center">
            <span className="rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 py-2 text-gray-600">
              €
            </span>
            <input
              type="number"
              value={store.reservationPriceEur || ''}
              onChange={(e) => store.setReservationPrice(Number(e.target.value) || 0)}
              min={1}
              max={10000}
              placeholder="80"
              className="w-full rounded-r-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          {validationError?.field === 'reservationPriceEur' && (
            <p className="mt-1 text-sm text-red-600">{validationError.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">
            Durata: <span className="font-bold">{store.durationDays} giorni</span>
          </label>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={store.durationDays}
            onChange={(e) => store.setDurationDays(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>1 giorno</span>
            <span>30 giorni</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">
            Città <span className="text-gray-500">(opzionale)</span>
          </label>
          <p className="text-xs text-gray-500">Per match con persone vicine</p>
          <input
            type="text"
            value={store.locationCity}
            onChange={(e) => store.setLocationCity(e.target.value)}
            placeholder="Es: Roma"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
          {validationError?.field === 'locationCity' && (
            <p className="mt-1 text-sm text-red-600">{validationError.message}</p>
          )}
        </div>

        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">{submitError}</p>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={createIntent.isPending}
            className="rounded-lg border border-gray-300 px-6 py-3 hover:bg-gray-50 disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createIntent.isPending}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createIntent.isPending ? 'Creazione...' : 'Crea intent'}
          </button>
        </div>
      </div>
    </div>
  )
}
