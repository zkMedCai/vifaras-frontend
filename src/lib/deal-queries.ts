import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  type DealDetailResponse,
  type DealListResponse,
  type DealSignSubmitRequest,
  type DealSignSubmitResponse,
} from './api-client'

export const DEALS_LIST_QUERY_KEY = (params?: {
  status?: string
  limit?: number
  offset?: number
}) => ['deals', 'list', params] as const

export const DEAL_DETAIL_QUERY_KEY = (id: string) => ['deals', 'detail', id] as const

export function useDeals(params?: { status?: string; limit?: number; offset?: number }) {
  return useQuery<DealListResponse>({
    queryKey: DEALS_LIST_QUERY_KEY(params),
    queryFn: () => api.dealsList(params),
  })
}

export function useDeal(id: string) {
  return useQuery<DealDetailResponse>({
    queryKey: DEAL_DETAIL_QUERY_KEY(id),
    queryFn: () => api.dealGet(id),
    enabled: Boolean(id),
  })
}

export function useCreateDealSignDraft() {
  return useMutation({
    mutationFn: (dealId: string) => api.dealSignDraft(dealId),
  })
}

export function useSubmitDealSignature() {
  const queryClient = useQueryClient()

  return useMutation<
    DealSignSubmitResponse,
    Error,
    { dealId: string; body: DealSignSubmitRequest }
  >({
    mutationFn: ({ dealId, body }) => api.dealSignSubmit(dealId, body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: DEAL_DETAIL_QUERY_KEY(variables.dealId) })
      void queryClient.invalidateQueries({ queryKey: ['deals', 'list'] })
    },
  })
}
