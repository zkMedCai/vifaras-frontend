'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useIntentStore } from '@/lib/intent-store'
import { useCreateIntent, useDraftIntentFromText } from '@/lib/intent-queries'
import { CATEGORY_GROUPS, getCategoriesByGroup, getCategoryLabel } from '@/lib/intent-categories'
import { ApiError, type NaturalIntentDraftResponse } from '@/lib/api-client'

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
    return { field: 'idealPriceEur', message: 'Il prezzo target deve essere maggiore di zero.' }
  }
  if (state.idealPriceEur > 10000) {
    return { field: 'idealPriceEur', message: 'Il prezzo non può superare €10.000.' }
  }
  if (state.reservationPriceEur <= 0) {
    return {
      field: 'reservationPriceEur',
      message: 'Il limite prezzo deve essere maggiore di zero.',
    }
  }
  if (state.side === 'sell' && state.idealPriceEur < state.reservationPriceEur) {
    return {
      field: 'idealPriceEur',
      message: 'Per vendere, il prezzo target deve essere almeno pari al minimo.',
    }
  }
  if (state.side === 'buy' && state.idealPriceEur > state.reservationPriceEur) {
    return {
      field: 'idealPriceEur',
      message: 'Per comprare, il prezzo target deve essere pari o sotto al massimo.',
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
      case 'invalid_price_relationship':
        return 'Prezzi non validi per il tipo di intent.'
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

function mapDraftError(err: unknown): string {
  if (err instanceof ApiError) {
    const code = (err.body as { detail?: { code?: string } })?.detail?.code
    switch (code) {
      case 'invalid_draft_prompt':
        return 'Scrivi una richiesta più chiara.'
      case 'intent_draft_cost_cap_reached':
        return 'Limite AI giornaliero raggiunto.'
      case 'intent_draft_provider_unavailable':
        return 'AI non disponibile. Riprova tra qualche istante.'
      case 'intent_draft_parse_failed':
        return 'Bozza non leggibile. Riprova riformulando.'
      default:
        return 'Errore tecnico nella bozza.'
    }
  }
  return 'Errore tecnico nella bozza.'
}

function splitLocation(location: unknown): { city: string; country: string } {
  if (typeof location !== 'string' || !location.includes(',')) {
    return { city: '', country: 'IT' }
  }
  const [city, country] = location.split(',').map((part) => part.trim())
  return { city: city || '', country: country || 'IT' }
}

function missingLabel(field: string): string {
  switch (field) {
    case 'side':
      return 'compra/vendi'
    case 'title':
      return 'titolo'
    case 'category':
      return 'categoria'
    case 'reservation_price_eur':
      return 'limite prezzo'
    case 'ideal_price_eur':
      return 'prezzo target'
    default:
      return field
  }
}

export default function IntentNewPage() {
  const router = useRouter()
  const store = useIntentStore()
  const reset = useIntentStore((s) => s.reset)
  const createIntent = useCreateIntent()
  const draftIntent = useDraftIntentFromText()
  const [prompt, setPrompt] = useState('')
  const [reviewVisible, setReviewVisible] = useState(false)
  const [draftResult, setDraftResult] = useState<NaturalIntentDraftResponse | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<UxError | null>(null)

  useEffect(() => {
    reset()
  }, [reset])

  const applyDraft = (draft: NaturalIntentDraftResponse) => {
    const { city, country } = splitLocation(draft.hard_constraints?.location)
    store.loadFromIntent({
      title: draft.title ?? '',
      description: draft.description ?? '',
      category: draft.category ?? '',
      side: draft.side === 'buy' || draft.side === 'sell' ? draft.side : null,
      reservationPriceEur: draft.reservation_price_eur ?? 0,
      idealPriceEur: draft.ideal_price_eur ?? 0,
      durationDays: draft.duration_days ?? 14,
      locationCity: city,
      locationCountry: country,
    })
    setDraftResult(draft)
    setReviewVisible(true)
    setValidationError(null)
    setSubmitError(null)
  }

  const handleDraft = async () => {
    const cleanPrompt = prompt.trim()
    setDraftError(null)
    if (cleanPrompt.length < 10) {
      setDraftError('Scrivi almeno una frase.')
      return
    }
    try {
      const draft = await draftIntent.mutateAsync({ prompt: cleanPrompt })
      applyDraft(draft)
    } catch (err) {
      setDraftError(mapDraftError(err))
      console.error('Intent draft failed:', err)
    }
  }

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
  const isBusy = createIntent.isPending || draftIntent.isPending
  const priceLimitLabel =
    store.side === 'sell' ? 'Prezzo minimo accettabile' : 'Prezzo massimo accettabile'
  const priceLimitHint =
    store.side === 'sell'
      ? "Sotto questo valore l'agente rifiuta automaticamente"
      : "Sopra questo valore l'agente rifiuta automaticamente"

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-950">Dai un incarico al tuo agente</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600">
                Scrivi l&apos;obiettivo in modo naturale. La bozza resta modificabile prima della
                pubblicazione.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setReviewVisible(true)
                setDraftResult(null)
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Compila manualmente
            </button>
          </div>

          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="Voglio vendere una bici da corsa taglia M a Roma, minimo 600 euro, target 750, ritiro a mano."
            className="mt-5 w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">{prompt.length} / 2000 caratteri</p>
            <button
              type="button"
              onClick={handleDraft}
              disabled={draftIntent.isPending}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {draftIntent.isPending ? 'Preparazione...' : 'Prepara bozza'}
            </button>
          </div>
          {draftError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
              {draftError}
            </div>
          )}
        </section>

        {reviewVisible && (
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Review intent</p>
                <h2 className="mt-1 text-xl font-semibold text-gray-950">
                  {store.title || 'Bozza intent'}
                </h2>
                {draftResult?.summary && (
                  <p className="mt-2 text-sm text-gray-600">{draftResult.summary}</p>
                )}
              </div>
              {draftResult && (
                <div className="text-sm text-gray-600 md:text-right">
                  <p>{Math.round((draftResult.confidence ?? 0) * 100)}% confidenza</p>
                  <p>{getCategoryLabel(store.category)}</p>
                </div>
              )}
            </div>

            {draftResult && draftResult.missing_fields.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Completa: {draftResult.missing_fields.map(missingLabel).join(', ')}.
              </div>
            )}

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
                <label className="block text-sm font-medium">Operazione</label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => store.setSide('buy')}
                    className={`rounded-lg border px-4 py-2 font-medium ${
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
                    className={`rounded-lg border px-4 py-2 font-medium ${
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
                <p className="mt-1 text-xs text-gray-500">
                  {store.description.length} / 2000 caratteri
                </p>
                {validationError?.field === 'description' && (
                  <p className="mt-1 text-sm text-red-600">{validationError.message}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">Prezzo target</label>
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
                      placeholder="750"
                      className="w-full rounded-r-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  {validationError?.field === 'idealPriceEur' && (
                    <p className="mt-1 text-sm text-red-600">{validationError.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium">{priceLimitLabel}</label>
                  <p className="text-xs text-gray-500">{priceLimitHint}</p>
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
                      placeholder={store.side === 'buy' ? '1300' : '600'}
                      className="w-full rounded-r-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  {validationError?.field === 'reservationPriceEur' && (
                    <p className="mt-1 text-sm text-red-600">{validationError.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
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
                  disabled={isBusy}
                  className="rounded-lg border border-gray-300 px-6 py-3 hover:bg-gray-50 disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isBusy}
                  className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {createIntent.isPending ? 'Pubblicazione...' : 'Pubblica intent'}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
