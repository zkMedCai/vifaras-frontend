import { useQuery } from '@tanstack/react-query'
import { api, type MatchDetailResponse, type MatchListResponse } from './api-client'

export const INTENT_MATCHES_QUERY_KEY = (
  intentId: string,
  params?: { limit?: number; offset?: number; min_score?: number },
) => ['matches', 'intent', intentId, params] as const

export const MATCH_DETAIL_QUERY_KEY = (id: string) => ['matches', 'detail', id] as const

export function useIntentMatches(
  intentId: string,
  params?: { limit?: number; offset?: number; min_score?: number },
) {
  return useQuery<MatchListResponse>({
    queryKey: INTENT_MATCHES_QUERY_KEY(intentId, params),
    queryFn: () => api.intentMatches(intentId, params),
    enabled: Boolean(intentId),
  })
}

export function useMatchDetail(id: string) {
  return useQuery<MatchDetailResponse>({
    queryKey: MATCH_DETAIL_QUERY_KEY(id),
    queryFn: () => api.matchGet(id),
    enabled: Boolean(id),
  })
}
