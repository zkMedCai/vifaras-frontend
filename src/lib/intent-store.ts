import { create } from 'zustand'

interface IntentDraft {
  title: string
  description: string
  category: string
  side: 'buy' | 'sell' | null
  reservationPriceEur: number
  idealPriceEur: number
  durationDays: number
  locationCity: string
  locationCountry: string
}

interface IntentStoreState extends IntentDraft {
  setTitle: (value: string) => void
  setDescription: (value: string) => void
  setCategory: (value: string) => void
  setSide: (value: 'buy' | 'sell') => void
  setReservationPrice: (value: number) => void
  setIdealPrice: (value: number) => void
  setDurationDays: (value: number) => void
  setLocationCity: (value: string) => void
  setLocationCountry: (value: string) => void
  reset: () => void
  loadFromIntent: (intent: IntentDraft) => void
}

const INITIAL_STATE: IntentDraft = {
  title: '',
  description: '',
  category: '',
  side: null,
  reservationPriceEur: 0,
  idealPriceEur: 0,
  durationDays: 14,
  locationCity: '',
  locationCountry: 'IT',
}

export const useIntentStore = create<IntentStoreState>((set) => ({
  ...INITIAL_STATE,
  setTitle: (value) => set({ title: value }),
  setDescription: (value) => set({ description: value }),
  setCategory: (value) => set({ category: value }),
  setSide: (value) => set({ side: value }),
  setReservationPrice: (value) => set({ reservationPriceEur: value }),
  setIdealPrice: (value) => set({ idealPriceEur: value }),
  setDurationDays: (value) => set({ durationDays: value }),
  setLocationCity: (value) => set({ locationCity: value }),
  setLocationCountry: (value) => set({ locationCountry: value }),
  reset: () => set(INITIAL_STATE),
  loadFromIntent: (intent) => set(intent),
}))
