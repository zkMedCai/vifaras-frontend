'use client'

import { useMemo, useState } from 'react'
import { ApiError } from '@/lib/api-client'
import type {
  CapitalMandateDraftFromTextResponse,
  CapitalMandateDraftResponse,
} from '@/lib/api-client'
import {
  useActiveCapitalMandate,
  useCapitalMandateLedger,
  useCapitalMandatePositions,
  useCreateCapitalMandateDraft,
  useCreateCapitalMandateDraftFromText,
  usePauseCapitalMandate,
  useRevokeCapitalMandate,
  useResumeCapitalMandate,
  useSubmitCapitalMandate,
} from '@/lib/capital-mandate-queries'
import { useAgentsMine } from '@/lib/agent-queries'
import { CATEGORIES, getCategoryLabel } from '@/lib/intent-categories'
import { signCapitalMandateWithPasskey } from '@/lib/webauthn'

const DEFAULT_CATEGORY_KEYS = ['electronics_laptops', 'electronics_gaming', 'hobby_collectibles']
const CATEGORY_CHOICES = CATEGORIES.filter((category) =>
  [
    'electronics_laptops',
    'electronics_phones',
    'electronics_gaming',
    'hobby_collectibles',
    'home_appliances',
    'misc_other',
  ].includes(category.key),
)

type RiskLevel = 'low' | 'medium' | 'high'

interface CapitalMandateFormState {
  budgetTotalEur: number
  durationDays: number
  maxSinglePurchaseEur: number
  maxOpenPositions: number
  minExpectedMarginPercent: number
  maxTotalLossEur: number
  riskLevel: RiskLevel
  allowedCategories: string[]
  autoBuy: boolean
  autoSell: boolean
  autoRelist: boolean
}

type DraftState = CapitalMandateDraftResponse | CapitalMandateDraftFromTextResponse

function formatEuro(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return '-'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function toCents(value: number) {
  return Math.round(value * 100)
}

function centsToEur(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) / 100 : fallback
}

function readNumber(payload: Record<string, unknown>, key: string, fallback: number) {
  const value = payload[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readString(payload: Record<string, unknown>, key: string, fallback: string) {
  const value = payload[key]
  return typeof value === 'string' && value ? value : fallback
}

function readBoolean(payload: Record<string, unknown>, key: string, fallback: boolean) {
  const value = payload[key]
  return typeof value === 'boolean' ? value : fallback
}

function readStringArray(payload: Record<string, unknown>, key: string, fallback: string[]) {
  const value = payload[key]
  if (!Array.isArray(value)) return fallback
  const clean = value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  return clean.length > 0 ? clean : fallback
}

function summaryText(summary: unknown) {
  if (!summary || typeof summary !== 'object') return ''
  const value = (summary as { human_readable?: unknown }).human_readable
  return typeof value === 'string' ? value : ''
}

function draftSummaryText(draft: DraftState) {
  if ('confirmation_summary' in draft && draft.confirmation_summary) {
    return draft.confirmation_summary
  }
  return summaryText(draft.payload_summary)
}

function missingFieldLabel(field: string) {
  switch (field) {
    case 'budget_total_eur':
      return 'budget totale'
    case 'max_single_purchase_eur':
      return 'massimo per acquisto'
    case 'allowed_categories':
      return 'categoria'
    default:
      return field
  }
}

function itemTitle(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== 'object') return 'Oggetto'
  const value = (snapshot as { title?: unknown }).title
  return typeof value === 'string' && value ? value : 'Oggetto'
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const detail = (
      error.body as { detail?: { code?: string; missing_fields?: string[] } } | undefined
    )?.detail
    const code = detail?.code
    switch (code) {
      case 'capital_mandate_invalid_limits':
        return 'I limiti scelti superano i cap V0.'
      case 'capital_mandate_text_missing_fields': {
        const fields = detail?.missing_fields?.map(missingFieldLabel).join(', ')
        return fields
          ? `Mancano dati per preparare la firma: ${fields}.`
          : 'Mancano dati per preparare la firma.'
      }
      case 'capital_mandate_text_cost_cap_reached':
        return 'Limite giornaliero AI raggiunto. Riprova più tardi.'
      case 'capital_mandate_text_provider_unavailable':
        return 'Il provider AI non è disponibile. Riprova tra poco.'
      case 'capital_mandate_text_parse_failed':
        return 'Non sono riuscito a trasformare il testo in una bozza sicura.'
      case 'base_mandate_required':
        return 'Serve un mandato base attivo per questo agente.'
      case 'active_capital_mandate_exists':
        return 'Esiste già un mandato budget attivo o sospeso.'
      case 'capital_mandate_webauthn_failed':
        return 'Firma passkey non riuscita. Riprova.'
      case 'capital_mandate_draft_expired':
        return 'La review è scaduta. Rigenera il mandato.'
      default:
        return 'Errore tecnico durante il mandato budget.'
    }
  }
  if (error instanceof Error && error.name === 'NotAllowedError') {
    return 'Firma annullata. Riprova quando sei pronto.'
  }
  return 'Errore tecnico durante il mandato budget.'
}

function initialFormState(): CapitalMandateFormState {
  return {
    budgetTotalEur: 500,
    durationDays: 30,
    maxSinglePurchaseEur: 100,
    maxOpenPositions: 5,
    minExpectedMarginPercent: 20,
    maxTotalLossEur: 50,
    riskLevel: 'medium',
    allowedCategories: DEFAULT_CATEGORY_KEYS,
    autoBuy: true,
    autoSell: true,
    autoRelist: true,
  }
}

export default function CapitalMandatePage() {
  const active = useActiveCapitalMandate()
  const agents = useAgentsMine()
  const createDraft = useCreateCapitalMandateDraft()
  const createTextDraft = useCreateCapitalMandateDraftFromText()
  const submitMandate = useSubmitCapitalMandate()
  const pauseMandate = usePauseCapitalMandate()
  const resumeMandate = useResumeCapitalMandate()
  const revokeMandate = useRevokeCapitalMandate()

  const [form, setForm] = useState<CapitalMandateFormState>(() => initialFormState())
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [chatPrompt, setChatPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)

  const activeAgent = agents.data?.agents.find((agent) => agent.status === 'active') ?? null
  const mandate = active.data?.mandate ?? null
  const capitalMandateId = mandate?.capital_mandate_id
  const ledger = useCapitalMandateLedger(capitalMandateId, Boolean(capitalMandateId))
  const positions = useCapitalMandatePositions(capitalMandateId, Boolean(capitalMandateId))

  const selectedCategoryLabels = useMemo(
    () => form.allowedCategories.map((key) => getCategoryLabel(key)).join(', '),
    [form.allowedCategories],
  )

  const updateForm = <K extends keyof CapitalMandateFormState>(
    key: K,
    value: CapitalMandateFormState[K],
  ) => {
    setDraft(null)
    setError(null)
    setForm((current) => ({ ...current, [key]: value }))
  }

  const toggleCategory = (key: string) => {
    setForm((current) => {
      const exists = current.allowedCategories.includes(key)
      const allowedCategories = exists
        ? current.allowedCategories.filter((item) => item !== key)
        : [...current.allowedCategories, key]
      return { ...current, allowedCategories }
    })
    setDraft(null)
    setError(null)
  }

  const applyTextDraftToForm = (response: CapitalMandateDraftFromTextResponse) => {
    const extracted = response.extracted_input as Record<string, unknown>
    setForm((current) => ({
      ...current,
      budgetTotalEur: centsToEur(extracted.budget_total_cents, current.budgetTotalEur),
      durationDays: readNumber(extracted, 'duration_days', current.durationDays),
      maxSinglePurchaseEur: centsToEur(
        extracted.max_single_purchase_cents,
        current.maxSinglePurchaseEur,
      ),
      maxOpenPositions: readNumber(extracted, 'max_open_positions', current.maxOpenPositions),
      minExpectedMarginPercent:
        readNumber(extracted, 'min_expected_margin_bps', current.minExpectedMarginPercent * 100) /
        100,
      maxTotalLossEur: centsToEur(extracted.max_total_loss_cents, current.maxTotalLossEur),
      riskLevel: readString(extracted, 'risk_level', current.riskLevel) as RiskLevel,
      allowedCategories: readStringArray(
        extracted,
        'allowed_categories',
        current.allowedCategories,
      ),
      autoBuy: readBoolean(extracted, 'auto_buy', current.autoBuy),
      autoSell: readBoolean(extracted, 'auto_sell', current.autoSell),
      autoRelist: readBoolean(extracted, 'auto_relist', current.autoRelist),
    }))
  }

  const handleCreateTextDraft = async () => {
    const prompt = chatPrompt.trim()
    if (prompt.length < 10) {
      setError('Scrivi almeno budget, categoria e massimo per acquisto.')
      return
    }
    setError(null)
    try {
      const response = await createTextDraft.mutateAsync({ prompt })
      applyTextDraftToForm(response)
      setDraft(response)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const handleCreateDraft = async () => {
    if (!activeAgent) {
      setError('Nessun agente attivo trovato.')
      return
    }
    setError(null)
    try {
      const response = await createDraft.mutateAsync({
        agent_id: activeAgent.id,
        budget_total_cents: toCents(form.budgetTotalEur),
        duration_days: form.durationDays,
        max_single_purchase_cents: toCents(form.maxSinglePurchaseEur),
        max_open_positions: form.maxOpenPositions,
        min_expected_margin_bps: Math.round(form.minExpectedMarginPercent * 100),
        max_total_loss_cents: toCents(form.maxTotalLossEur),
        risk_level: form.riskLevel,
        allowed_categories: form.allowedCategories,
        geo_scope: ['IT'],
        auto_buy: form.autoBuy,
        auto_sell: form.autoSell,
        auto_relist: form.autoRelist,
      })
      setDraft(response)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const handleSign = async () => {
    if (!draft) return
    setError(null)
    try {
      const assertion = await signCapitalMandateWithPasskey({ challenge: draft.challenge })
      await submitMandate.mutateAsync({
        draft_id: draft.draft_id,
        webauthn_assertion: assertion,
      })
      setDraft(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const handlePause = async () => {
    if (!capitalMandateId) return
    setError(null)
    try {
      await pauseMandate.mutateAsync(capitalMandateId)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const handleResume = async () => {
    if (!capitalMandateId) return
    setError(null)
    try {
      await resumeMandate.mutateAsync(capitalMandateId)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const handleRevoke = async () => {
    if (!capitalMandateId) return
    setError(null)
    try {
      await revokeMandate.mutateAsync({ id: capitalMandateId, reason: 'user_revoked' })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (active.isLoading || agents.isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-gray-600">Caricamento...</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Mandato budget 30 giorni</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Autorizzi il tuo agente a operare autonomamente entro questi limiti.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {mandate ? (
          <section className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Stato</p>
                  <h2 className="mt-1 text-xl font-semibold text-gray-950">{mandate.status}</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    Scadenza {formatDate(mandate.expires_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {mandate.status === 'paused' ? (
                    <button
                      type="button"
                      onClick={handleResume}
                      disabled={resumeMandate.isPending}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      Riprendi
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePause}
                      disabled={pauseMandate.isPending}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      Sospendi
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRevoke}
                    disabled={revokeMandate.isPending}
                    className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Revoca
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Budget totale" value={formatEuro(mandate.budget_total_cents)} />
                <Metric
                  label="Disponibile"
                  value={formatEuro(active.data?.budget_state?.available_cents)}
                />
                <Metric
                  label="Riservato"
                  value={formatEuro(active.data?.budget_state?.reserved_cents)}
                />
                <Metric
                  label="Posizioni aperte"
                  value={String(active.data?.positions_summary?.open ?? 0)}
                />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section>
                <h2 className="text-lg font-semibold text-gray-950">Posizioni</h2>
                <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
                  {(positions.data?.positions.length ?? 0) === 0 ? (
                    <p className="px-4 py-5 text-sm text-gray-600">Nessuna posizione aperta.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {positions.data?.positions.map((position) => (
                        <div key={position.id} className="px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-sm font-medium text-gray-950">
                              {itemTitle(position.item_snapshot)}
                            </p>
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                              {position.status}
                            </span>
                          </div>
                          <div className="mt-2 grid gap-2 text-sm text-gray-600 sm:grid-cols-3">
                            <span>Acquisto {formatEuro(position.purchase_price_cents)}</span>
                            <span>
                              Rivendita {formatEuro(position.expected_resale_price_cents)}
                            </span>
                            <span>Profitto {formatEuro(position.expected_profit_cents)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-950">Ledger operativo</h2>
                <div className="mt-3 rounded-lg border border-gray-200 bg-white">
                  {(ledger.data?.entries.length ?? 0) === 0 ? (
                    <p className="px-4 py-5 text-sm text-gray-600">Nessun movimento operativo.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {ledger.data?.entries.slice(0, 8).map((entry) => (
                        <div key={entry.id} className="px-4 py-3 text-sm">
                          <div className="flex justify-between gap-3">
                            <span className="font-medium text-gray-950">{entry.type}</span>
                            <span>{formatEuro(entry.amount_cents)}</span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">{entry.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </section>
        ) : (
          <section className="space-y-6">
            <div className="rounded-lg border border-blue-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-950">Mandato da chat</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Scrivi budget, categoria, limite per acquisto e margine minimo.
                  </p>
                </div>
                {draft && 'confidence' in draft && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    {Math.round((draft.confidence ?? 0) * 100)}% confidenza
                  </span>
                )}
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
                <textarea
                  value={chatPrompt}
                  onChange={(event) => {
                    setChatPrompt(event.target.value)
                    setError(null)
                  }}
                  rows={4}
                  placeholder="Usa 500 euro per comprare laptop usati, massimo 100 euro a pezzo, margine minimo 20%, poi rivendi se conviene."
                  className="min-h-28 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleCreateTextDraft}
                  disabled={createTextDraft.isPending}
                  className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 lg:self-start"
                >
                  {createTextDraft.isPending ? 'Preparazione...' : 'Prepara review'}
                </button>
              </div>
              {draft && 'confirmation_summary' in draft && (
                <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
                  {draft.confirmation_summary}
                </p>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    label="Budget totale"
                    suffix="EUR"
                    value={form.budgetTotalEur}
                    min={1}
                    max={500}
                    onChange={(value) => updateForm('budgetTotalEur', value)}
                  />
                  <NumberField
                    label="Durata"
                    suffix="giorni"
                    value={form.durationDays}
                    min={1}
                    max={30}
                    onChange={(value) => updateForm('durationDays', value)}
                  />
                  <NumberField
                    label="Massimo per singolo acquisto"
                    suffix="EUR"
                    value={form.maxSinglePurchaseEur}
                    min={1}
                    max={500}
                    onChange={(value) => updateForm('maxSinglePurchaseEur', value)}
                  />
                  <NumberField
                    label="Massimo posizioni aperte"
                    value={form.maxOpenPositions}
                    min={1}
                    max={20}
                    onChange={(value) => updateForm('maxOpenPositions', value)}
                  />
                  <NumberField
                    label="Margine minimo atteso"
                    suffix="%"
                    value={form.minExpectedMarginPercent}
                    min={0}
                    max={100}
                    onChange={(value) => updateForm('minExpectedMarginPercent', value)}
                  />
                  <NumberField
                    label="Perdita massima"
                    suffix="EUR"
                    value={form.maxTotalLossEur}
                    min={0}
                    max={500}
                    onChange={(value) => updateForm('maxTotalLossEur', value)}
                  />
                </div>

                <div className="mt-5">
                  <p className="text-sm font-medium text-gray-700">Rischio</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(['low', 'medium', 'high'] as RiskLevel[]).map((risk) => (
                      <button
                        key={risk}
                        type="button"
                        onClick={() => updateForm('riskLevel', risk)}
                        className={
                          form.riskLevel === risk
                            ? 'rounded-md border border-blue-600 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700'
                            : 'rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50'
                        }
                      >
                        {risk}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-sm font-medium text-gray-700">Categorie consentite</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {CATEGORY_CHOICES.map((category) => (
                      <label
                        key={category.key}
                        className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={form.allowedCategories.includes(category.key)}
                          onChange={() => toggleCategory(category.key)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span>{category.labelIt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <Toggle
                    label="Auto-buy"
                    checked={form.autoBuy}
                    onChange={(checked) => updateForm('autoBuy', checked)}
                  />
                  <Toggle
                    label="Auto-sell"
                    checked={form.autoSell}
                    onChange={(checked) => updateForm('autoSell', checked)}
                  />
                  <Toggle
                    label="Auto-relist"
                    checked={form.autoRelist}
                    onChange={(checked) => updateForm('autoRelist', checked)}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCreateDraft}
                  disabled={
                    !activeAgent || createDraft.isPending || form.allowedCategories.length === 0
                  }
                  className="mt-6 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  Crea review mandato
                </button>
              </div>

              <aside className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                  <h2 className="text-lg font-semibold text-gray-950">Review</h2>
                  <div className="mt-4 space-y-3 text-sm">
                    <ReviewRow label="Budget" value={formatEuro(toCents(form.budgetTotalEur))} />
                    <ReviewRow label="Durata" value={`${form.durationDays} giorni`} />
                    <ReviewRow
                      label="Massimo acquisto"
                      value={formatEuro(toCents(form.maxSinglePurchaseEur))}
                    />
                    <ReviewRow label="Categorie" value={selectedCategoryLabels || '-'} />
                    <ReviewRow label="Margine minimo" value={`${form.minExpectedMarginPercent}%`} />
                  </div>
                  <p className="mt-4 text-xs leading-5 text-gray-500">
                    Non ti verrà chiesta approvazione per ogni deal che rientra nel mandato. V0 non
                    muove denaro reale: questa funzione prepara policy, autorizzazioni e ledger
                    operativo. I profitti non sono garantiti.
                  </p>
                </div>

                {draft && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
                    <h2 className="text-lg font-semibold text-blue-950">Firma passkey</h2>
                    <p className="mt-2 text-sm text-blue-900">{draftSummaryText(draft)}</p>
                    <button
                      type="button"
                      onClick={handleSign}
                      disabled={submitMandate.isPending}
                      className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
                    >
                      {submitMandate.isPending ? 'Firma in corso...' : 'Firma mandato budget'}
                    </button>
                  </div>
                )}
              </aside>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 px-4 py-3">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-950">{value}</p>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-950">{value}</span>
    </div>
  )
}

function NumberField({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <div className="mt-1 flex rounded-md border border-gray-300 bg-white focus-within:border-blue-500">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(Number(event.target.value))}
          className="min-w-0 flex-1 rounded-md border-0 bg-transparent px-3 py-2 text-sm outline-none"
        />
        {suffix && <span className="px-3 py-2 text-sm text-gray-500">{suffix}</span>}
      </div>
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300"
      />
    </label>
  )
}
