'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { useAuthHydrated } from '@/lib/use-auth-hydrated'
import type { Tier } from '@/lib/auth-store'

interface TierGuardProps {
  requiredTier: Tier
  children: React.ReactNode
  fallbackPath?: string
}

export function TierGuard({ requiredTier, children, fallbackPath = '/dashboard' }: TierGuardProps) {
  const router = useRouter()
  const isHydrated = useAuthHydrated()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!isHydrated) return
    if (user === null) {
      router.replace('/login')
      return
    }
    if (user.tier < requiredTier) {
      router.replace(fallbackPath)
    }
  }, [isHydrated, user, requiredTier, fallbackPath, router])

  if (!isHydrated || user === null || user.tier < requiredTier) {
    return null
  }

  return <>{children}</>
}
