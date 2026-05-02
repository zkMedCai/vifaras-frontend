import { create } from 'zustand'

interface MandateConfig {
  // User-facing fields (slider screens 2-4). Defaults + ranges align with
  // backend platform_limits.py — submitting a value outside range yields
  // 422 limits_exceed_platform_cap.
  maxPricePerDealEur: number // default 100, range 20-1000
  maxTotalVolumeEur: number // default 500, range 50-5000
  maxDealsPerDay: number // default 3, range 1-10

  // Read-only V0 (screen 5). Wildcard '*' = all marketplace categories
  // except HARD_FORBIDDEN_CATEGORIES (alcohol, weapons, drugs, etc.) —
  // the server enforces the exclusion list.
  categoriesAllowed: string[]
  geoScope: string[]

  // Server-set after POST /api/mandates/draft (S2).
  agentId: string | null
  draftId: string | null
  challenge: string | null
  payloadSummary: string | null
}

interface MandateStoreState extends MandateConfig {
  setMaxPricePerDeal: (value: number) => void
  setMaxTotalVolume: (value: number) => void
  setMaxDealsPerDay: (value: number) => void
  setAgentId: (id: string) => void
  setDraftResponse: (response: {
    draft_id: string
    challenge: string
    payload_summary: string
  }) => void
  reset: () => void
}

const INITIAL_STATE: MandateConfig = {
  maxPricePerDealEur: 100,
  maxTotalVolumeEur: 500,
  maxDealsPerDay: 3,
  categoriesAllowed: ['*'],
  geoScope: ['IT'],
  agentId: null,
  draftId: null,
  challenge: null,
  payloadSummary: null,
}

export const useMandateStore = create<MandateStoreState>((set) => ({
  ...INITIAL_STATE,
  setMaxPricePerDeal: (value) => set({ maxPricePerDealEur: value }),
  setMaxTotalVolume: (value) => set({ maxTotalVolumeEur: value }),
  setMaxDealsPerDay: (value) => set({ maxDealsPerDay: value }),
  setAgentId: (id) => set({ agentId: id }),
  setDraftResponse: (response) =>
    set({
      draftId: response.draft_id,
      challenge: response.challenge,
      payloadSummary: response.payload_summary,
    }),
  reset: () => set(INITIAL_STATE),
}))
