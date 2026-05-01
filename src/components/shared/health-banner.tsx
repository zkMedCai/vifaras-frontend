'use client'

import { useQuery } from '@tanstack/react-query'
import { api, ApiError, type HealthResponse } from '@/lib/api-client'
import { cn } from '@/lib/utils'

const statusStyles = {
  healthy: 'bg-green-50 text-green-700',
  degraded: 'bg-amber-50 text-amber-700',
  unhealthy: 'bg-red-50 text-red-700',
} as const

type KnownStatus = keyof typeof statusStyles

function isKnownStatus(status: string): status is KnownStatus {
  return status in statusStyles
}

export function HealthBanner() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 30_000,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="bg-slate-100 px-4 py-2 text-sm text-slate-600">Connecting to backend...</div>
    )
  }

  if (error) {
    const message =
      error instanceof ApiError ? `Backend error (${error.statusCode})` : 'Backend offline'

    return <div className="bg-red-50 px-4 py-2 text-sm text-red-700">⚠ {message}</div>
  }

  if (!data) return null

  return <HealthBannerSuccess data={data} />
}

function HealthBannerSuccess({ data }: { data: HealthResponse }) {
  const styleClass = isKnownStatus(data.status) ? statusStyles[data.status] : statusStyles.unhealthy

  return (
    <div className={cn('px-4 py-2 text-sm', styleClass)}>
      ✓ Backend {data.status}
      <span className="ml-2 text-xs opacity-70">
        (DB: {data.checks.database} · scheduler: {data.checks.agent_scheduler})
      </span>
    </div>
  )
}
