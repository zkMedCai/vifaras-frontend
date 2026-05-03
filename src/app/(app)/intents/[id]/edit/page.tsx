'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useIntent, useUpdateIntent, useCancelIntent } from '@/lib/intent-queries'
import { useIntentStore } from '@/lib/intent-store'
import { useAuthStore } from '@/lib/auth-store'
import { CATEGORY_GROUPS, getCategoriesByGroup } from '@/lib/intent-categories'
import { ApiError } from '@/lib/api-client'

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
      case 'intent_not_found':
        return 'Intent non trovato. Torna alla lista.'
      case 'intent_not_editable':
        return 'Questo intent non è modificabile (stato non attivo).'
      case 'intent_in_active_negotiation':
        return 'Modifica non possibile: ci sono negoziazioni in corso su questo intent.'
      case 'tier_too_low_for_price_update':
        return 'Modifica del prezzo richiede un mandato attivo (Tier 2).'
      case 'embedding_service_unavailable':
        return 'Servizio non disponibile. Riprova tra qualche istante.'
      default:
        return 'Errore tecnico. Riprova.'
    }
  }
  return 'Errore tecnico. Riprova.'
}

export default function IntentEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: intent, isLoading, error } = useIntent(id)
  const store = useIntentStore()
  const loadFromIntent = useIntentStore((s) => s.loadFromIntent)
  const updateIntent = useUpdateIntent(id)
  const cancelIntent = useCancelIntent(id)
  const userTier = useAuthStore((s) => s.user?.tier ?? 0)

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<UxError | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  useEffect(() => {
    if (intent) {
      const hardConstraints = intent.hard_constraints as Record<string, unknown> | null | undefined
      const locationRaw = (hardConstraints?.location as string | undefined) ?? ''
      const [city, country] = locationRaw.split(',').map((s) => s.trim())

      const created = new Date(intent.created_at).getTime()
      const expires = new Date(intent.expires_at).getTime()
      const durationDays = Math.max(1, Math.round((expires - created) / 86_400_000))

      loadFromIntent({
        title: intent.title,
        description: intent.description ?? '',
        category: intent.category,
        side: intent.side as 'buy' | 'sell',
        reservationPriceEur: intent.reservation_price_eur,
        idealPriceEur: intent.ideal_price_eur,
        durationDays,
        locationCity: city ?? '',
        locationCountry: country ?? 'IT',
      })
    }
  }, [intent, loadFromIntent])

  if (isLoading) {
    return <div className="p-6 text-gray-600">Caricamento...</div>
  }

  if (error || !intent) {
    return <div className="p-6 text-red-600">Errore caricamento intent. Torna alla lista.</div>
  }

  const isEditable = intent.status === 'active'
  const priceCanChange = userTier >= 2

  const handleSubmit = async () => {
    setSubmitError(null)

    const valError = validateClient(store)
    if (valError) {
      setValidationError(valError)
      return
    }
    setValidationError(null)

    try {
      // Backend treats `category` and `side` as IMMUTABLE post-create —
      // sending them (even unchanged) raises 422 (CategoryNotModifiable /
      // SideNotModifiable). We omit them entirely.
      //
      // Prices are tier-2 gated; we send them only when actually changed
      // so an unchanged price doesn't unnecessarily trigger the price
      // gate — and so a tier=1 user editing only the title doesn't 403.
      const updates: Parameters<typeof updateIntent.mutateAsync>[0] = {
        title: store.title.trim(),
        description: store.description.trim() || null,
        duration_days: store.durationDays,
      }
      if (intent && store.reservationPriceEur !== intent.reservation_price_eur) {
        updates.reservation_price_eur = store.reservationPriceEur
      }
      if (intent && store.idealPriceEur !== intent.ideal_price_eur) {
        updates.ideal_price_eur = store.idealPriceEur
      }
      await updateIntent.mutateAsync(updates)
      router.push('/intents')
    } catch (err) {
      setSubmitError(mapBackendError(err))
      console.error('Intent update failed:', err)
    }
  }

  const handleCancel = () => {
    router.push('/intents')
  }

  const handleCancelIntent = async () => {
    try {
      await cancelIntent.mutateAsync()
      router.push('/intents')
    } catch (err) {
      setSubmitError(mapBackendError(err))
      setShowCancelDialog(false)
    }
  }

  const grouped = getCategoriesByGroup()

  const hardConstraintsLocation =
    ((intent.hard_constraints as Record<string, unknown>)?.location as string) ?? ''

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Modifica intent</h1>

      {!isEditable && (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm">
            Questo intent non è modificabile perché è in stato <strong>{intent.status}</strong>.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium">Titolo</label>
          <input
            type="text"
            value={store.title}
            onChange={(e) => store.setTitle(e.target.value)}
            disabled={!isEditable}
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
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
              disabled={!isEditable}
              className={`flex-1 rounded-lg border px-4 py-2 font-medium ${
                store.side === 'buy'
                  ? 'border-blue-600 bg-blue-50 text-blue-800'
                  : 'border-gray-300 hover:border-gray-400'
              } disabled:opacity-50`}
            >
              Compro
            </button>
            <button
              type="button"
              onClick={() => store.setSide('sell')}
              disabled={!isEditable}
              className={`flex-1 rounded-lg border px-4 py-2 font-medium ${
                store.side === 'sell'
                  ? 'border-blue-600 bg-blue-50 text-blue-800'
                  : 'border-gray-300 hover:border-gray-400'
              } disabled:opacity-50`}
            >
              Vendo
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Categoria</label>
          <select
            value={store.category}
            onChange={(e) => store.setCategory(e.target.value)}
            disabled={!isEditable}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
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
        </div>

        <div>
          <label className="block text-sm font-medium">
            Descrizione <span className="text-gray-500">(opzionale)</span>
          </label>
          <textarea
            value={store.description}
            onChange={(e) => store.setDescription(e.target.value)}
            disabled={!isEditable}
            maxLength={2000}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">{store.description.length} / 2000 caratteri</p>
        </div>

        <div>
          <label className="block text-sm font-medium">
            Prezzo target (ideale)
            {!priceCanChange && (
              <span className="ml-2 text-xs text-gray-500">(richiede Tier 2)</span>
            )}
          </label>
          <p className="text-xs text-gray-500">Quanto vorresti idealmente</p>
          <div className="mt-1 flex items-center">
            <span className="rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 py-2 text-gray-600">
              €
            </span>
            <input
              type="number"
              value={store.idealPriceEur || ''}
              onChange={(e) => store.setIdealPrice(Number(e.target.value) || 0)}
              disabled={!isEditable || !priceCanChange}
              min={1}
              max={10000}
              className="w-full rounded-r-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          {validationError?.field === 'idealPriceEur' && (
            <p className="mt-1 text-sm text-red-600">{validationError.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">
            {store.side === 'sell' ? 'Prezzo minimo accettabile' : 'Prezzo massimo accettabile'}
            {!priceCanChange && (
              <span className="ml-2 text-xs text-gray-500">(richiede Tier 2)</span>
            )}
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
              disabled={!isEditable || !priceCanChange}
              min={1}
              max={10000}
              className="w-full rounded-r-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
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
            disabled={!isEditable}
            className="mt-2 w-full disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>1 giorno</span>
            <span>30 giorni</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">
            Città <span className="text-gray-500">(immutabile)</span>
          </label>
          <input
            type="text"
            value={hardConstraintsLocation || '(non specificata)'}
            disabled
            className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Per modificare la città, cancella l&apos;intent e creane uno nuovo.
          </p>
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
            disabled={updateIntent.isPending}
            className="rounded-lg border border-gray-300 px-6 py-3 hover:bg-gray-50 disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isEditable || updateIntent.isPending}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {updateIntent.isPending ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
        </div>
      </div>

      <div className="mt-12 border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold text-red-700">Zona pericolosa</h2>
        <p className="mt-2 text-sm text-gray-600">
          Annullare l&apos;intent è irreversibile. Saranno annullate anche le negoziazioni in corso
          (se presenti).
        </p>
        <button
          onClick={() => setShowCancelDialog(true)}
          disabled={cancelIntent.isPending || intent.status === 'cancelled'}
          className="mt-4 rounded-lg border border-red-300 bg-white px-6 py-3 text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Annulla intent
        </button>
      </div>

      {showCancelDialog && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 max-w-md rounded-lg bg-white p-6">
            <h3 className="text-lg font-bold">Annulla intent</h3>
            <p className="mt-3 text-gray-700">Sei sicuro di voler annullare questo intent?</p>
            <p className="mt-2 text-sm text-gray-600">
              Saranno annullate tutte le negoziazioni in corso. Questa azione non può essere
              annullata.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                disabled={cancelIntent.isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
              >
                No, indietro
              </button>
              <button
                onClick={handleCancelIntent}
                disabled={cancelIntent.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelIntent.isPending ? 'Annullamento...' : 'Sì, annulla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
