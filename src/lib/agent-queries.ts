'use client'

import { useQuery } from '@tanstack/react-query'
import { api, type AgentsMineResponse } from './api-client'

export const AGENTS_MINE_QUERY_KEY = ['agents', 'mine'] as const

export function useAgentsMine() {
  return useQuery<AgentsMineResponse>({
    queryKey: AGENTS_MINE_QUERY_KEY,
    queryFn: () => api.agentsMine(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useFirstPendingMandateAgent() {
  const { data, isLoading, error } = useAgentsMine()
  const agent = data?.agents.find((a) => a.status === 'pending_mandate') ?? null
  return { agent, isLoading, error }
}
