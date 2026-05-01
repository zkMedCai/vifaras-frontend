import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  setAuth: (data: { accessToken: string; refreshToken: string; user: User }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (data) => set({ ...data }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'vifaras-auth' },
  ),
)
