'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ApiError } from '@/lib/api-client'
import {
  useCreateDealSignDraft,
  useDeal,
  useDealMessages,
  useSendDealMessage,
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

function roleLabel(role: 'buyer' | 'seller' | null) {
  if (role === 'buyer') return 'compratore'
  if (role === 'seller') return 'venditore'
  return 'parte'
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

export default function DealDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const dealId = params.id
  const { data, isLoading, error } = useDeal(dealId)
  const createDraft = useCreateDealSignDraft()
  const submitSignature = useSubmitDealSignature()
  const messages = useDealMessages(dealId, data?.status === 'confirmed')
  const sendMessage = useSendDealMessage()
  const [uxError, setUxError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [chatText, setChatText] = useState('')
  const [chatError, setChatError] = useState<string | null>(null)

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
            <h2 className="text-lg font-semibold text-gray-950">Chat post-deal</h2>
            <p className="mt-1 text-sm text-gray-600">
              {data.status === 'confirmed'
                ? 'Canale sbloccato dopo la doppia firma.'
                : 'Si sblocca solo quando compratore e venditore hanno firmato.'}
            </p>
          </div>
          <span
            className={`w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${
              data.status === 'confirmed'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 bg-gray-100 text-gray-700'
            }`}
          >
            {data.status === 'confirmed' ? 'Sbloccata' : 'Bloccata'}
          </span>
        </div>

        {data.status === 'confirmed' && (
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
