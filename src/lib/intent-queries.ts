'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  type CancelIntentResponse,
  type CreateIntentRequest,
  type CreateIntentResponse,
  type IntentListResponse,
  type IntentResponse,
  type UpdateIntentRequest,
  type UpdateIntentResponse,
} from './api-client'

export const INTENTS_LIST_QUERY_KEY = ['intents', 'list'] as const
export const INTENT_DETAIL_QUERY_KEY = (id: string) => ['intents', 'detail', id] as const

export function useIntentsMine(params?: {
  status?: string
  side?: string
  limit?: number
  offset?: number
}) {
  return useQuery<IntentListResponse>({
    queryKey: [...INTENTS_LIST_QUERY_KEY, params],
    queryFn: () => api.intentsList(params),
    staleTime: 30 * 1000,
  })
}

export function useIntent(id: string) {
  return useQuery<IntentResponse>({
    queryKey: INTENT_DETAIL_QUERY_KEY(id),
    queryFn: () => api.intentGet(id),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateIntent() {
  const queryClient = useQueryClient()
  return useMutation<CreateIntentResponse, Error, CreateIntentRequest>({
    mutationFn: (body) => api.intentCreate(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTENTS_LIST_QUERY_KEY })
    },
  })
}

export function useUpdateIntent(id: string) {
  const queryClient = useQueryClient()
  return useMutation<UpdateIntentResponse, Error, UpdateIntentRequest>({
    mutationFn: (body) => api.intentUpdate(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTENT_DETAIL_QUERY_KEY(id) })
      queryClient.invalidateQueries({ queryKey: INTENTS_LIST_QUERY_KEY })
    },
  })
}

export function useCancelIntent(id: string) {
  const queryClient = useQueryClient()
  return useMutation<CancelIntentResponse, Error, void>({
    mutationFn: () => api.intentCancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTENT_DETAIL_QUERY_KEY(id) })
      queryClient.invalidateQueries({ queryKey: INTENTS_LIST_QUERY_KEY })
    },
  })
}
