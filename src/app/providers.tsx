'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/lib/auth-store'
import { useAuthHydrated } from '@/lib/use-auth-hydrated'

// On every app load, swap the access token for a fresh one so the JWT
// tier claim reflects the user's CURRENT DB state — required because tier
// upgrades (Self verification, mandate signing, dev SQL stub) mutate the
// user without invalidating the locally-persisted access token. Refresh
// failure is treated as a logout: refresh tokens are long-lived, so a
// rejection means the session is genuinely no longer valid.
function AuthBootstrap() {
  const isHydrated = useAuthHydrated()
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (!isHydrated || !refreshToken) return
    api
      .refresh({ refresh_token: refreshToken })
      .then((resp) => setAccessToken(resp.access_token))
      .catch((err) => {
        if (err instanceof ApiError) {
          logout()
        }
      })
  }, [isHydrated, refreshToken, setAccessToken, logout])

  return null
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      {children}
    </QueryClientProvider>
  )
}
