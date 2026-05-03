import { useQuery } from '@tanstack/react-query'
import { api, type MarketListResponse } from './api-client'

export const MARKET_LIST_QUERY_KEY = (params?: {
  side?: string
  category?: string
  location?: string
  limit?: number
  offset?: number
}) => ['market', 'list', params] as const

export function useMarketList(params?: {
  side?: string
  category?: string
  location?: string
  limit?: number
  offset?: number
}) {
  return useQuery<MarketListResponse>({
    queryKey: MARKET_LIST_QUERY_KEY(params),
    queryFn: () => api.marketList(params),
    staleTime: 30 * 1000,
  })
}
