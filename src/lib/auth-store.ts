import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { decodeAccessToken } from './jwt-decode-helper'

export type Tier = 0 | 1 | 2

interface User {
  id: string
  email: string
  tier: Tier
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  setAuth: (data: { accessToken: string; refreshToken: string; user: User }) => void
  // Atomic JWT swap: decode the new token, derive tier, and apply both to the
  // user object in one set() so a render never sees a token/tier mismatch.
  setAccessToken: (token: string) => void
  setTier: (tier: Tier) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (data) => set({ ...data }),
      setAccessToken: (token) =>
        set((state) => {
          const decoded = decodeAccessToken(token)
          const tier = decoded?.tier ?? state.user?.tier ?? 0
          return {
            accessToken: token,
            user: state.user ? { ...state.user, tier } : state.user,
          }
        }),
      setTier: (tier) =>
        set((state) => ({
          user: state.user ? { ...state.user, tier } : state.user,
        })),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'vifaras-auth' },
  ),
)
