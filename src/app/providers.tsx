'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/lib/auth-store'
import { useAuthHydrated } from '@/lib/use-auth-hydrated'

// On every app load, swap the access token for a fresh one so the JWT
// tier claim reflects the user's CURRENT DB state — required because tier
// upgrades (Self verification, mandate signing, dev SQL stub) mutate the
// user without invalidating the locally-persisted access token.
//
// Refresh failure handling:
// - 401: the refresh token is invalidated (consumed by another tab,
//   expired, or the server's JWT secret rotated). The currently-held
//   access token may still be valid for the rest of its 15-minute TTL,
//   so we do NOT log the user out preemptively — they'll naturally hit
//   logout when the access token expires and the next protected call
//   401s. This avoids a hard kick-out on dev workflow events like a
//   backend restart or a refresh consumed by a parallel test run.
// - Anything else (network, 5xx): treat as a genuine session issue and
//   log out so the user lands on the login screen rather than a stale UI.
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
          if (err.statusCode === 401) {
            console.warn(
              'Refresh-on-mount 401: refresh token invalidated, ' +
                'continuing with current access_token until expiry',
            )
            return
          }
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
