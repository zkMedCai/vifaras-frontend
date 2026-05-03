import { useQuery } from '@tanstack/react-query'
import { api, type NegotiationListResponse, type NegotiationStateResponse } from './api-client'

export const NEGOTIATIONS_LIST_QUERY_KEY = (params?: {
  status?: string
  limit?: number
  offset?: number
}) => ['negotiations', 'list', params] as const

export const NEGOTIATION_DETAIL_QUERY_KEY = (id: string) => ['negotiations', 'detail', id] as const

export function useNegotiations(params?: { status?: string; limit?: number; offset?: number }) {
  return useQuery<NegotiationListResponse>({
    queryKey: NEGOTIATIONS_LIST_QUERY_KEY(params),
    queryFn: () => api.negotiationsList(params),
  })
}

export function useNegotiation(id: string) {
  return useQuery<NegotiationStateResponse>({
    queryKey: NEGOTIATION_DETAIL_QUERY_KEY(id),
    queryFn: () => api.negotiationGet(id),
    enabled: Boolean(id),
  })
}
