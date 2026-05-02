'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMandateStore } from '@/lib/mandate-store'
import { useSubmitMandate } from '@/lib/mandate-queries'
import { useAuthStore } from '@/lib/auth-store'
import { signMandateWithPasskey } from '@/lib/webauthn'
import { ApiError } from '@/lib/api-client'
import { getNextStep, getPrevStep } from '@/lib/mandate-steps'

interface UxError {
  code:
    | 'webauthn_cancelled'
    | 'webauthn_failed'
    | 'draft_expired'
    | 'draft_not_found'
    | 'draft_already_consumed'
    | 'limits_exceeded'
    | 'agent_state'
    | 'unknown'
  message: string
}

function mapBackendError(err: unknown): UxError {
  if (err instanceof ApiError) {
    const code = (err.body as { detail?: { code?: string } } | undefined)?.detail?.code

    switch (code) {
      case 'draft_expired':
        return {
          code: 'draft_expired',
          message: 'Sessione scaduta. Ricomincia la configurazione.',
        }
      case 'draft_not_found':
        return {
          code: 'draft_not_found',
          message: 'Sessione persa. Ricomincia la configurazione.',
        }
      case 'draft_already_consumed':
        return {
          code: 'draft_already_consumed',
          message: 'Mandato già firmato. Vai alla home.',
        }
      case 'webauthn_verification_failed':
        return {
          code: 'webauthn_failed',
          message: 'Firma non riuscita. Riprova.',
        }
      case 'limits_exceed_platform_cap':
        return {
          code: 'limits_exceeded',
          message: 'Configurazione non permessa. Riprova con valori inferiori.',
        }
      case 'agent_in_wrong_state':
      case 'invalid_tier_transition':
        return {
          code: 'agent_state',
          message: 'Mandato già configurato. Vai alla home.',
        }
      default:
        return {
          code: 'unknown',
          message: 'Errore tecnico. Riprova più tardi.',
        }
    }
  }

  if (err instanceof Error) {
    if (err.name === 'NotAllowedError') {
      return {
        code: 'webauthn_cancelled',
        message: 'Firma annullata. Riprova quando sei pronto.',
      }
    }
    return {
      code: 'webauthn_failed',
      message: 'Errore durante la firma. Verifica il dispositivo biometrico.',
    }
  }

  return { code: 'unknown', message: 'Errore tecnico. Riprova più tardi.' }
}

export default function MandateSignPage() {
  const router = useRouter()
  const draftId = useMandateStore((s) => s.draftId)
  const challenge = useMandateStore((s) => s.challenge)
  const payloadSummary = useMandateStore((s) => s.payloadSummary)
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const submitMandate = useSubmitMandate()

  const [uxError, setUxError] = useState<UxError | null>(null)

  const handleSign = async () => {
    if (!draftId || !challenge) {
      setUxError({
        code: 'draft_not_found',
        message: 'Sessione persa. Ricomincia la configurazione.',
      })
      return
    }

    setUxError(null)

    try {
      const assertion = await signMandateWithPasskey({ challenge })

      const response = await submitMandate.mutateAsync({
        draft_id: draftId,
        webauthn_assertion: assertion,
      })

      setAccessToken(response.new_access_token)

      const next = getNextStep('sign')
      if (next) router.push(`/onboarding/mandate/${next}`)
    } catch (err) {
      const mapped = mapBackendError(err)
      setUxError(mapped)
      console.error('Mandate signing failed:', err)
    }
  }

  const handleAbort = () => {
    const prev = getPrevStep('sign')
    if (prev) router.push(`/onboarding/mandate/${prev}`)
  }

  if (!draftId || !challenge) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h2 className="text-xl font-semibold text-red-600">Sessione persa</h2>
        <p className="mt-4 text-gray-700">
          La configurazione precedente è andata persa. Ricomincia il processo di creazione del
          mandato.
        </p>
        <button
          onClick={() => router.push('/onboarding/mandate/welcome')}
          className="mt-6 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Ricomincia
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h2 className="text-2xl font-bold">Firma il mandato</h2>

      {payloadSummary && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="font-semibold">Stai firmando:</h3>
          <p className="mt-2 text-sm text-gray-700">{payloadSummary}</p>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-gray-700">
          Per autorizzare il mandato, conferma la tua identità con autenticazione biometrica (Face
          ID, Touch ID, o equivalente).
        </p>
      </div>

      {uxError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">{uxError.message}</p>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button
          onClick={handleAbort}
          disabled={submitMandate.isPending}
          className="rounded-lg border border-gray-300 px-6 py-3 hover:bg-gray-50 disabled:opacity-50"
        >
          Indietro
        </button>
        <button
          onClick={handleSign}
          disabled={submitMandate.isPending}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitMandate.isPending ? 'Firma in corso...' : 'Firma con biometrica'}
        </button>
      </div>
    </div>
  )
}
