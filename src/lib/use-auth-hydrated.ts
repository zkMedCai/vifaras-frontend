'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from './auth-store'

// Reads `useAuthStore.persist.hasHydrated()` only after mount to keep the
// initial render deterministic between SSR (always false) and CSR — without
// this the rehydrated value flashes a different tree and triggers React's
// hydration mismatch warning.
export function useAuthHydrated(): boolean {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true)
      return
    }
    return useAuthStore.persist.onFinishHydration(() => setIsHydrated(true))
  }, [])

  return isHydrated
}
