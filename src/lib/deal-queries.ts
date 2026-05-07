import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  type DealDetailResponse,
  type DealMessageItem,
  type DealMessageListResponse,
  type DealListResponse,
  type DealSendMessageRequest,
  type DealSignSubmitRequest,
  type DealSignSubmitResponse,
  type DealTradeWindowActionRequest,
  type DealTradeWindowResponse,
} from './api-client'

export const DEALS_LIST_QUERY_KEY = (params?: {
  status?: string
  limit?: number
  offset?: number
}) => ['deals', 'list', params] as const

export const DEAL_DETAIL_QUERY_KEY = (id: string) => ['deals', 'detail', id] as const
export const DEAL_MESSAGES_QUERY_KEY = (id: string) => ['deals', 'messages', id] as const
export const DEAL_TRADE_WINDOW_QUERY_KEY = (id: string) => ['deals', 'trade-window', id] as const

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
      void queryClient.invalidateQueries({
        queryKey: DEAL_TRADE_WINDOW_QUERY_KEY(variables.dealId),
      })
    },
  })
}

export function useDealTradeWindow(id: string, enabled: boolean) {
  return useQuery<DealTradeWindowResponse>({
    queryKey: DEAL_TRADE_WINDOW_QUERY_KEY(id),
    queryFn: () => api.dealTradeWindow(id),
    enabled: Boolean(id) && enabled,
  })
}

export function useApplyTradeWindowAction() {
  const queryClient = useQueryClient()

  return useMutation<
    DealTradeWindowResponse,
    Error,
    { dealId: string; body: DealTradeWindowActionRequest }
  >({
    mutationFn: ({ dealId, body }) => api.dealTradeWindowAction(dealId, body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: DEAL_TRADE_WINDOW_QUERY_KEY(variables.dealId),
      })
      void queryClient.invalidateQueries({ queryKey: DEAL_DETAIL_QUERY_KEY(variables.dealId) })
      void queryClient.invalidateQueries({ queryKey: ['deals', 'list'] })
    },
  })
}

export function useDealMessages(id: string, enabled: boolean) {
  return useQuery<DealMessageListResponse>({
    queryKey: DEAL_MESSAGES_QUERY_KEY(id),
    queryFn: () => api.dealMessages(id, { limit: 50 }),
    enabled: Boolean(id) && enabled,
  })
}

export function useSendDealMessage() {
  const queryClient = useQueryClient()

  return useMutation<DealMessageItem, Error, { dealId: string; body: DealSendMessageRequest }>({
    mutationFn: ({ dealId, body }) => api.dealSendMessage(dealId, body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: DEAL_MESSAGES_QUERY_KEY(variables.dealId) })
    },
  })
}
