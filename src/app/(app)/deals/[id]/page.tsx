'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ApiError, type DealShippingOptionsResponse } from '@/lib/api-client'
import {
  useApplyTradeWindowAction,
  useCreateDealSignDraft,
  useDeal,
  useDealShippingOptions,
  useDealMessages,
  useDealTradeWindow,
  useSendDealMessage,
  useSelectDealShippingMethod,
  useSubmitDealSignature,
} from '@/lib/deal-queries'
import {
  formatDateTime,
  formatEuroCents,
  formatStatus,
  statusBadgeClass,
} from '@/lib/marketplace-format'
import { useAuthStore } from '@/lib/auth-store'
import { getWebAuthnErrorMessage } from '@/lib/auth-errors'
import { signDealWithPasskey } from '@/lib/webauthn'

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function base64ToText(value: string) {
  try {
    const binary = atob(value)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return '[messaggio cifrato]'
  }
}

function textToBase64(value: string) {
  return bytesToBase64(new TextEncoder().encode(value))
}

function randomNonceB64() {
  const nonce = new Uint8Array(12)
  crypto.getRandomValues(nonce)
  return bytesToBase64(nonce)
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function roleLabel(role: 'buyer' | 'seller' | null) {
  if (role === 'buyer') return 'compratore'
  if (role === 'seller') return 'venditore'
  return 'parte'
}

function nextActionLabel(action: string | undefined) {
  const labels: Record<string, string> = {
    select_shipping_method: 'Selezionare metodo di spedizione',
    prepare_shipment: 'Preparare spedizione o consegna',
    seller_prepare_shipping: 'Preparare spedizione o consegna',
    wait_for_seller_shipping: 'Attendere aggiornamento venditore',
    buyer_confirm_delivery: 'Confermare ricezione',
    wait_for_buyer_delivery: 'Attendere conferma compratore',
    complete_trade: 'Completare trade',
    trade_completed: 'Trade completato',
    review_trade_window: 'Verificare stato Trade Window',
  }
  return action ? labels[action] ?? action : 'In attesa'
}

function shippingStatusLabel(status: string | undefined) {
  const labels: Record<string, string> = {
    shipping_pending: 'Shipping pending',
    shipped: 'Shipped',
    delivered: 'Delivered',
    completed: 'Completed',
  }
  return status ? labels[status] ?? status : 'Shipping pending'
}

function disabledReasonLabel(reason: string | null | undefined) {
  const labels: Record<string, string> = {
    pickup_not_available: 'Ritiro non disponibile per questo deal',
    tracking_required_over_25_eur: 'Tracking richiesto sopra i 25 EUR',
    category_not_compatible: 'Categoria non compatibile',
    insurance_required_for_high_value: 'Assicurazione richiesta per alto valore',
  }
  return reason
    ? labels[reason] ?? 'Non disponibile per questo deal'
    : 'Non disponibile per questo deal'
}

function tradeStepState(
  current: string | undefined,
  step: 'shipping_pending' | 'shipped' | 'delivered' | 'completed',
) {
  const order = ['shipping_pending', 'shipped', 'delivered', 'completed']
  const currentIndex = order.indexOf(current ?? 'shipping_pending')
  const stepIndex = order.indexOf(step)
  if (currentIndex > stepIndex) return 'done'
  if (currentIndex === stepIndex) return 'current'
  return 'pending'
}

function TimelineItem({
  label,
  state,
}: {
  label: string
  state: 'done' | 'current' | 'pending'
}) {
  const markerClass =
    state === 'done'
      ? 'border-emerald-500 bg-emerald-500'
      : state === 'current'
        ? 'border-blue-600 bg-white'
        : 'border-gray-300 bg-white'
  const textClass =
    state === 'done' ? 'text-gray-950' : state === 'current' ? 'text-blue-700' : 'text-gray-500'

  return (
    <li className="flex min-w-[150px] items-center gap-3">
      <span className={`h-3 w-3 shrink-0 rounded-full border-2 ${markerClass}`} />
      <span className={`text-sm font-medium ${textClass}`}>{label}</span>
    </li>
  )
}

function TradeWindowStep({
  label,
  detail,
  state,
}: {
  label: string
  detail: string
  state: 'done' | 'current' | 'pending'
}) {
  const borderClass =
    state === 'done' ? 'border-emerald-300' : state === 'current' ? 'border-blue-300' : 'border-gray-200'
  const labelClass =
    state === 'done'
      ? 'text-emerald-700'
      : state === 'current'
        ? 'text-blue-700'
        : 'text-gray-500'

  return (
    <div className={`border-l pl-4 ${borderClass}`}>
      <p className={`font-semibold ${labelClass}`}>{label}</p>
      <p className="mt-1 text-gray-600">{detail}</p>
    </div>
  )
}

type ShippingOption = DealShippingOptionsResponse['options'][number]

function ShippingOptionCard({
  option,
  checked,
  onSelect,
}: {
  option: ShippingOption
  checked: boolean
  onSelect: () => void
}) {
  const stateClass = !option.allowed
    ? 'border-gray-200 bg-gray-50 opacity-70'
    : checked
      ? 'border-blue-500 bg-blue-50'
      : 'border-gray-200 bg-white hover:border-blue-200'

  return (
    <label className={`block rounded-lg border p-4 text-sm ${stateClass}`}>
      <div className="flex items-start gap-3">
        <input
          type="radio"
          name="shipping-method"
          checked={checked}
          disabled={!option.allowed}
          onChange={onSelect}
          className="mt-1 h-4 w-4"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-950">{option.label}</span>
            {option.recommended && option.allowed && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                Metodo consigliato
              </span>
            )}
            {!option.allowed && (
              <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-semibold text-gray-600">
                Non disponibile per questo deal
              </span>
            )}
          </div>
          <p className="mt-1 text-gray-600">{option.description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-800">
              {formatEuroCents(option.price_cents)}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-800">
              {option.tracking_required ? 'Tracciata' : 'Non tracciata'}
            </span>
            {option.insurance_available && (
              <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-800">
                Assicurazione disponibile
              </span>
            )}
            {option.insurance_required && (
              <span className="rounded-full bg-red-50 px-2 py-1 text-red-700">
                Assicurazione richiesta
              </span>
            )}
          </div>
          {!option.allowed && (
            <p className="mt-3 text-xs font-semibold text-gray-600">
              {disabledReasonLabel(option.disabled_reason)}
            </p>
          )}
        </div>
      </div>
    </label>
  )
}

function mapSignError(err: unknown) {
  const webauthnMessage = getWebAuthnErrorMessage(err)
  if (webauthnMessage) return webauthnMessage

  if (err instanceof ApiError) {
    const code = (err.body as { detail?: { code?: string } } | undefined)?.detail?.code
    switch (code) {
      case 'already_signed':
        return 'Hai già firmato questo deal.'
      case 'deal_not_pending':
        return 'Questo deal non è più in attesa di firma.'
      case 'deal_already_expired':
        return 'Questo deal è scaduto.'
      case 'deal_draft_expired':
        return 'La sessione di firma è scaduta. Riprova.'
      case 'deal_draft_not_found':
        return 'La sessione di firma non è più disponibile. Riprova.'
      case 'deal_draft_already_consumed':
        return 'Questa sessione di firma è già stata usata.'
      case 'deal_webauthn_verification_failed':
        return 'Firma non verificata. Riprova con la tua passkey.'
      default:
        if (err.statusCode === 429) return 'Troppi tentativi. Attendi qualche secondo.'
        if (err.statusCode >= 500) return 'Errore backend. Riprova più tardi.'
    }
  }

  return 'Firma non riuscita. Riprova.'
}

function mapTradeActionError(err: unknown) {
  if (err instanceof ApiError) {
    const code = (err.body as { detail?: { code?: string } } | undefined)?.detail?.code
    switch (code) {
      case 'trade_window_action_forbidden':
        return 'Azione non disponibile per il tuo ruolo.'
      case 'invalid_trade_window_transition':
        return 'Azione non valida per lo stato attuale.'
      case 'deal_not_confirmed':
        return 'Trade Window bloccata finché entrambe le parti non firmano.'
      default:
        if (err.statusCode === 429) return 'Troppi tentativi. Attendi qualche secondo.'
        if (err.statusCode >= 500) return 'Errore backend. Riprova più tardi.'
    }
  }

  return 'Azione Trade Window non riuscita.'
}

function mapShippingSelectionError(err: unknown) {
  if (err instanceof ApiError) {
    const code = (err.body as { detail?: { code?: string } } | undefined)?.detail?.code
    switch (code) {
      case 'deal_not_confirmed':
        return 'La spedizione si sblocca dopo la doppia firma.'
      case 'not_party_to_deal':
        return 'Non puoi accedere a questo deal.'
      case 'shipping_method_not_allowed':
        return 'Questo metodo non è ammesso per valore/categoria del deal.'
      default:
        if (err.statusCode === 429) return 'Troppi tentativi. Attendi qualche secondo.'
        if (err.statusCode >= 500) return 'Errore backend. Riprova più tardi.'
    }
  }

  return 'Selezione spedizione non riuscita.'
}

export default function DealDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const dealId = params.id
  const { data, isLoading, error } = useDeal(dealId)
  const createDraft = useCreateDealSignDraft()
  const submitSignature = useSubmitDealSignature()
  const tradeUnlocked = data?.status === 'confirmed' || data?.status === 'completed'
  const tradeWindow = useDealTradeWindow(dealId, tradeUnlocked)
  const shippingOptions = useDealShippingOptions(dealId, tradeUnlocked)
  const messages = useDealMessages(dealId, tradeUnlocked)
  const sendMessage = useSendDealMessage()
  const applyTradeAction = useApplyTradeWindowAction()
  const selectShippingMethod = useSelectDealShippingMethod()
  const [uxError, setUxError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [chatText, setChatText] = useState('')
  const [chatError, setChatError] = useState<string | null>(null)
  const [trackingReference, setTrackingReference] = useState('')
  const [tradeActionError, setTradeActionError] = useState<string | null>(null)
  const [selectedShippingCode, setSelectedShippingCode] = useState<string | null>(null)
  const [shippingSelectionError, setShippingSelectionError] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-gray-600">Caricamento deal...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-red-600">Deal non disponibile o permessi insufficienti.</p>
      </div>
    )
  }

  const myRole =
    user?.id === data.buyer_user_id ? 'buyer' : user?.id === data.seller_user_id ? 'seller' : null
  const mySignedAt =
    myRole === 'buyer' ? data.buyer_signed_at : myRole === 'seller' ? data.seller_signed_at : null
  const counterpartySignedAt =
    myRole === 'buyer' ? data.seller_signed_at : myRole === 'seller' ? data.buyer_signed_at : null
  const canSign = data.status === 'pending_signatures' && myRole !== null && !mySignedAt
  const isBusy = createDraft.isPending || submitSignature.isPending
  const isCompleted = data.status === 'completed'
  const isTradeUnlocked = tradeUnlocked
  const tradeTerms = tradeWindow.data?.terms_summary ?? {}
  const tradeTitle =
    asString(tradeTerms.sell_intent_title) ?? asString(tradeTerms.buy_intent_title) ?? 'Deal'
  const tradeCategory = asString(tradeTerms.category) ?? 'Categoria non specificata'
  const tradeDelivery = asString(tradeTerms.delivery) ?? 'Da coordinare'
  const tradePriceCents = asNumber(tradeTerms.agreed_price_cents) ?? data.agreed_price_cents
  const shippingStatus = tradeWindow.data?.shipping_status ?? 'shipping_pending'
  const selectedShippingMethod = shippingOptions.data?.selected_method ?? null
  const recommendedShippingCode =
    shippingOptions.data?.options.find((option) => option.allowed && option.recommended)?.code ??
    shippingOptions.data?.options.find((option) => option.allowed)?.code ??
    ''
  const effectiveShippingCode = selectedShippingCode ?? recommendedShippingCode
  const canMarkShipped =
    isTradeUnlocked &&
    myRole === 'seller' &&
    shippingStatus === 'shipping_pending' &&
    Boolean(selectedShippingMethod)
  const canMarkDelivered = isTradeUnlocked && myRole === 'buyer' && shippingStatus === 'shipped'
  const canCompleteTrade =
    isTradeUnlocked && myRole !== null && shippingStatus === 'delivered' && !isCompleted
  const tradeActionBusy = applyTradeAction.isPending
  const shippingSelectionBusy = selectShippingMethod.isPending

  const handleSign = async () => {
    setUxError(null)
    setSuccessMessage(null)

    try {
      const draft = await createDraft.mutateAsync(data.deal_id)
      const assertion = await signDealWithPasskey({ challenge: draft.challenge })
      const response = await submitSignature.mutateAsync({
        dealId: data.deal_id,
        body: {
          draft_id: draft.draft_id,
          webauthn_assertion: assertion,
        },
      })

      setSuccessMessage(
        response.deal_confirmed
          ? 'Deal confermato. Entrambe le parti hanno firmato.'
          : "Firma registrata. Manca solo la firma dell'altra parte.",
      )
    } catch (err) {
      setUxError(mapSignError(err))
      console.error('Deal signing failed:', err)
    }
  }

  const handleTradeAction = async (
    action: 'mark_shipped' | 'mark_delivered' | 'mark_completed',
  ) => {
    setTradeActionError(null)
    setSuccessMessage(null)

    try {
      await applyTradeAction.mutateAsync({
        dealId: data.deal_id,
        body: {
          action,
          tracking_reference:
            action === 'mark_shipped' ? trackingReference.trim() || null : null,
        },
      })
      if (action === 'mark_shipped') {
        setTrackingReference('')
        setSuccessMessage('Spedizione registrata.')
      } else if (action === 'mark_delivered') {
        setSuccessMessage('Consegna confermata.')
      } else {
        setSuccessMessage('Trade completato.')
      }
    } catch (err) {
      setTradeActionError(mapTradeActionError(err))
    }
  }

  const handleSelectShippingMethod = async () => {
    if (!effectiveShippingCode) return

    setShippingSelectionError(null)
    setSuccessMessage(null)

    try {
      await selectShippingMethod.mutateAsync({
        dealId: data.deal_id,
        body: {
          method_code: effectiveShippingCode,
          paid_by: 'buyer',
        },
      })
      setSelectedShippingCode(null)
      setSuccessMessage('Metodo di spedizione selezionato.')
    } catch (err) {
      setShippingSelectionError(mapShippingSelectionError(err))
    }
  }

  const handleSendMessage = async () => {
    const text = chatText.trim()
    if (!text) return

    setChatError(null)
    try {
      await sendMessage.mutateAsync({
        dealId: data.deal_id,
        body: {
          encrypted_content_b64: textToBase64(text),
          nonce_b64: randomNonceB64(),
        },
      })
      setChatText('')
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        setChatError('Chat bloccata finché entrambe le parti non firmano.')
        return
      }
      setChatError('Invio messaggio non riuscito.')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <button onClick={() => router.push('/deals')} className="text-sm text-blue-700">
        Indietro ai deal
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
              data.status,
            )}`}
          >
            {formatStatus(data.status)}
          </span>
          <h1 className="mt-3 text-2xl font-bold text-gray-950">Deal {data.deal_id.slice(0, 8)}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Accordo da {formatEuroCents(data.agreed_price_cents)} · creato{' '}
            {formatDateTime(data.created_at)}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <div>
            <dt className="text-gray-500">Ruolo</dt>
            <dd className="mt-1 font-semibold capitalize">{roleLabel(myRole)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Scadenza</dt>
            <dd className="mt-1 font-semibold">{formatDateTime(data.expires_at)}</dd>
          </div>
        </dl>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-950">Stato firme</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="border-l border-gray-200 pl-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Compratore</p>
            <p className="mt-2 font-semibold">
              {data.buyer_signed_at
                ? `Firmato ${formatDateTime(data.buyer_signed_at)}`
                : 'Firma mancante'}
            </p>
          </div>
          <div className="border-l border-gray-200 pl-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Venditore</p>
            <p className="mt-2 font-semibold">
              {data.seller_signed_at
                ? `Firmato ${formatDateTime(data.seller_signed_at)}`
                : 'Firma mancante'}
            </p>
          </div>
        </div>

        {data.status === 'pending_signatures' && (
          <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-gray-700">
            {mySignedAt
              ? "Hai già firmato. Il deal resta pending finché firma anche l'altra parte."
              : counterpartySignedAt
                ? "L'altra parte ha già firmato. Manca la tua passkey per confermare il deal."
                : 'Il deal richiede firma passkey da entrambe le parti entro la scadenza.'}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-950">Deal timeline</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TimelineItem label="Accordo negoziato" state="done" />
          <TimelineItem label="Seller signed" state={data.seller_signed_at ? 'done' : 'pending'} />
          <TimelineItem label="Buyer signed" state={data.buyer_signed_at ? 'done' : 'pending'} />
          <TimelineItem label="Deal confirmed" state={isTradeUnlocked ? 'done' : 'pending'} />
          <TimelineItem
            label="Trade Window"
            state={isCompleted ? 'done' : isTradeUnlocked ? 'current' : 'pending'}
          />
          <TimelineItem label="Completed" state={isCompleted ? 'done' : 'pending'} />
        </ol>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-950">Dettagli accordo</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Negoziazione</dt>
            <dd className="mt-1 font-mono text-xs">{data.negotiation_id}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Valuta</dt>
            <dd className="mt-1 font-semibold">{data.currency}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Intent compratore</dt>
            <dd className="mt-1 font-mono text-xs">{data.buy_intent_id}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Intent venditore</dt>
            <dd className="mt-1 font-mono text-xs">{data.sell_intent_id}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">Trade Window</h2>
            <p className="mt-1 text-sm text-gray-600">
              {isTradeUnlocked
                ? 'Finestra operativa aperta per coordinare consegna e completamento.'
                : 'Si apre dopo la doppia firma passkey.'}
            </p>
          </div>
          <span
            className={`w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${
              isCompleted
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : isTradeUnlocked
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-gray-100 text-gray-700'
            }`}
          >
            {isCompleted ? 'Completata' : isTradeUnlocked ? 'Attiva' : 'Bloccata'}
          </span>
        </div>

        {!isTradeUnlocked ? (
          <p className="mt-5 text-sm text-gray-600">
            Prima servono le firme di compratore e venditore.
          </p>
        ) : tradeWindow.isLoading ? (
          <p className="mt-5 text-sm text-gray-600">Caricamento Trade Window...</p>
        ) : tradeWindow.error || !tradeWindow.data ? (
          <p className="mt-5 text-sm font-semibold text-red-700">
            Trade Window non disponibile.
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Oggetto</dt>
                <dd className="mt-1 font-semibold text-gray-950">{tradeTitle}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Categoria</dt>
                <dd className="mt-1 font-semibold text-gray-950">{tradeCategory}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Prezzo accordato</dt>
                <dd className="mt-1 font-semibold text-gray-950">
                  {formatEuroCents(tradePriceCents)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Consegna</dt>
                <dd className="mt-1 font-semibold text-gray-950">{tradeDelivery}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Confermata</dt>
                <dd className="mt-1 font-semibold text-gray-950">
                  {formatDateTime(tradeWindow.data.confirmed_at)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Prossima azione</dt>
                <dd className="mt-1 font-semibold text-gray-950">
                  {nextActionLabel(tradeWindow.data.next_required_action)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Stato logistico</dt>
                <dd className="mt-1 font-semibold text-gray-950">
                  {shippingStatusLabel(tradeWindow.data.shipping_status)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Tracking</dt>
                <dd className="mt-1 font-semibold text-gray-950">
                  {tradeWindow.data.tracking_reference ?? 'Non inserito'}
                </dd>
              </div>
            </dl>

            <div className="space-y-4 border-t border-gray-100 pt-4">
              <div>
                <h3 className="text-base font-semibold text-gray-950">Spedizione</h3>
                {shippingOptions.isLoading ? (
                  <p className="mt-2 text-sm text-gray-600">Caricamento opzioni spedizione...</p>
                ) : shippingOptions.error ? (
                  <p className="mt-2 text-sm font-semibold text-red-700">
                    {mapShippingSelectionError(shippingOptions.error)}
                  </p>
                ) : selectedShippingMethod ? (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
                    <p className="font-semibold text-emerald-800">Metodo selezionato</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-950">
                        {selectedShippingMethod.method_label}
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-gray-800">
                        {formatEuroCents(selectedShippingMethod.price_cents)}
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-gray-800">
                        {selectedShippingMethod.tracking_required ? 'Tracciata' : 'Non tracciata'}
                      </span>
                      {selectedShippingMethod.insurance_available && (
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-gray-800">
                          Assicurazione disponibile
                        </span>
                      )}
                      {selectedShippingMethod.insurance_required && (
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-red-700">
                          Assicurazione richiesta
                        </span>
                      )}
                    </div>
                    {shippingStatus === 'shipping_pending' && (
                      <p className="mt-3 text-sm font-semibold text-gray-700">
                        Spedizione da preparare
                      </p>
                    )}
                  </div>
                ) : isCompleted ? (
                  <p className="mt-2 text-sm text-gray-600">Metodo non selezionato.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      {shippingOptions.data?.options.map((option) => (
                        <ShippingOptionCard
                          key={option.code}
                          option={option}
                          checked={effectiveShippingCode === option.code}
                          onSelect={() => setSelectedShippingCode(option.code)}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => void handleSelectShippingMethod()}
                      disabled={!effectiveShippingCode || shippingSelectionBusy}
                      className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {shippingSelectionBusy
                        ? 'Selezione...'
                        : 'Seleziona metodo di spedizione'}
                    </button>
                    {shippingSelectionError && (
                      <p className="text-sm font-semibold text-red-700">
                        {shippingSelectionError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <TradeWindowStep
                label="Shipping pending"
                detail="Venditore in preparazione."
                state={tradeStepState(shippingStatus, 'shipping_pending')}
              />
              <TradeWindowStep
                label="Shipped"
                detail={
                  tradeWindow.data.shipped_at
                    ? formatDateTime(tradeWindow.data.shipped_at)
                    : 'Non ancora spedito.'
                }
                state={tradeStepState(shippingStatus, 'shipped')}
              />
              <TradeWindowStep
                label="Delivered"
                detail={
                  tradeWindow.data.delivered_at
                    ? formatDateTime(tradeWindow.data.delivered_at)
                    : 'Consegna da confermare.'
                }
                state={tradeStepState(shippingStatus, 'delivered')}
              />
              <TradeWindowStep
                label="Completed"
                detail={
                  tradeWindow.data.completed_at
                    ? formatDateTime(tradeWindow.data.completed_at)
                    : 'Chiusura in attesa.'
                }
                state={tradeStepState(shippingStatus, 'completed')}
              />
            </div>

            {(canMarkShipped || canMarkDelivered || canCompleteTrade || tradeActionError) && (
              <div className="space-y-3 border-t border-gray-100 pt-4">
                {canMarkShipped && (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={trackingReference}
                      onChange={(event) => setTrackingReference(event.target.value)}
                      className="min-h-11 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      maxLength={120}
                      placeholder="Tracking opzionale"
                    />
                    <button
                      onClick={() => void handleTradeAction('mark_shipped')}
                      disabled={tradeActionBusy}
                      className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {tradeActionBusy ? 'Aggiornamento...' : 'Segna spedito'}
                    </button>
                  </div>
                )}

                {canMarkDelivered && (
                  <button
                    onClick={() => void handleTradeAction('mark_delivered')}
                    disabled={tradeActionBusy}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {tradeActionBusy ? 'Aggiornamento...' : 'Conferma consegna'}
                  </button>
                )}

                {canCompleteTrade && (
                  <button
                    onClick={() => void handleTradeAction('mark_completed')}
                    disabled={tradeActionBusy}
                    className="rounded-lg bg-gray-950 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {tradeActionBusy ? 'Aggiornamento...' : 'Completa trade'}
                  </button>
                )}

                {tradeActionError && (
                  <p className="text-sm font-semibold text-red-700">{tradeActionError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">Chat post-deal</h2>
            <p className="mt-1 text-sm text-gray-600">
              {isTradeUnlocked
                ? 'Canale sbloccato dopo la doppia firma.'
                : 'Si sblocca solo quando compratore e venditore hanno firmato.'}
            </p>
          </div>
          <span
            className={`w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${
              isTradeUnlocked
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 bg-gray-100 text-gray-700'
            }`}
          >
            {isTradeUnlocked ? 'Sbloccata' : 'Bloccata'}
          </span>
        </div>

        {isTradeUnlocked && (
          <div className="mt-5 space-y-4">
            <div className="space-y-3">
              {messages.isLoading ? (
                <p className="text-sm text-gray-600">Caricamento messaggi...</p>
              ) : messages.data?.messages.length ? (
                messages.data.messages.map((message) => (
                  <div key={message.message_id} className="border-l border-gray-200 pl-4 text-sm">
                    <p className="font-mono text-xs text-gray-500">
                      {message.sender_user_id.slice(0, 8)} · {formatDateTime(message.sent_at)}
                    </p>
                    <p className="mt-1 text-gray-800">
                      {base64ToText(message.encrypted_content_b64)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600">Nessun messaggio ancora.</p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={chatText}
                onChange={(event) => setChatText(event.target.value)}
                className="min-h-11 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Scrivi un messaggio post-deal"
              />
              <button
                onClick={handleSendMessage}
                disabled={sendMessage.isPending || !chatText.trim()}
                className="rounded-lg bg-gray-950 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {sendMessage.isPending ? 'Invio...' : 'Invia'}
              </button>
            </div>
            {chatError && <p className="text-sm font-semibold text-red-700">{chatError}</p>}
          </div>
        )}
      </section>

      {uxError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">{uxError}</p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">{successMessage}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {canSign && (
          <button
            onClick={handleSign}
            disabled={isBusy}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isBusy ? 'Firma in corso...' : `Firma come ${roleLabel(myRole)}`}
          </button>
        )}
        <button
          onClick={() => router.push(`/negotiations/${data.negotiation_id}`)}
          className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Apri transcript
        </button>
      </div>
    </div>
  )
}
