'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  type ActiveCapitalMandateResponse,
  type CapitalMandateDraftFromTextRequest,
  type CapitalMandateDraftFromTextResponse,
  type CapitalMandateDraftRequest,
  type CapitalMandateDraftResponse,
  type CapitalMandateLedgerResponse,
  type CapitalMandatePositionsResponse,
  type CapitalMandateResponse,
  type CapitalMandateSubmitRequest,
  type CapitalMandateSubmitResponse,
} from './api-client'

export const CAPITAL_MANDATE_ACTIVE_QUERY_KEY = ['capital-mandates', 'active'] as const
export const CAPITAL_MANDATE_LEDGER_QUERY_KEY = (id: string) =>
  ['capital-mandates', id, 'ledger'] as const
export const CAPITAL_MANDATE_POSITIONS_QUERY_KEY = (id: string) =>
  ['capital-mandates', id, 'positions'] as const

export function useActiveCapitalMandate() {
  return useQuery<ActiveCapitalMandateResponse>({
    queryKey: CAPITAL_MANDATE_ACTIVE_QUERY_KEY,
    queryFn: () => api.activeCapitalMandate(),
  })
}

export function useCreateCapitalMandateDraft() {
  return useMutation<CapitalMandateDraftResponse, Error, CapitalMandateDraftRequest>({
    mutationFn: (body) => api.createCapitalMandateDraft(body),
  })
}

export function useCreateCapitalMandateDraftFromText() {
  return useMutation<
    CapitalMandateDraftFromTextResponse,
    Error,
    CapitalMandateDraftFromTextRequest
  >({
    mutationFn: (body) => api.createCapitalMandateDraftFromText(body),
  })
}

export function useSubmitCapitalMandate() {
  const queryClient = useQueryClient()

  return useMutation<CapitalMandateSubmitResponse, Error, CapitalMandateSubmitRequest>({
    mutationFn: (body) => api.submitCapitalMandate(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CAPITAL_MANDATE_ACTIVE_QUERY_KEY })
    },
  })
}

export function usePauseCapitalMandate() {
  const queryClient = useQueryClient()

  return useMutation<CapitalMandateResponse, Error, string>({
    mutationFn: (id) => api.capitalMandatePause(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: CAPITAL_MANDATE_ACTIVE_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: CAPITAL_MANDATE_LEDGER_QUERY_KEY(id) })
    },
  })
}

export function useResumeCapitalMandate() {
  const queryClient = useQueryClient()

  return useMutation<CapitalMandateResponse, Error, string>({
    mutationFn: (id) => api.capitalMandateResume(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: CAPITAL_MANDATE_ACTIVE_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: CAPITAL_MANDATE_LEDGER_QUERY_KEY(id) })
    },
  })
}

export function useRevokeCapitalMandate() {
  const queryClient = useQueryClient()

  return useMutation<CapitalMandateResponse, Error, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }) => api.capitalMandateRevoke(id, reason),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: CAPITAL_MANDATE_ACTIVE_QUERY_KEY })
      void queryClient.invalidateQueries({
        queryKey: CAPITAL_MANDATE_LEDGER_QUERY_KEY(variables.id),
      })
    },
  })
}

export function useCapitalMandateLedger(id: string | undefined, enabled: boolean) {
  return useQuery<CapitalMandateLedgerResponse>({
    queryKey: CAPITAL_MANDATE_LEDGER_QUERY_KEY(id || ''),
    queryFn: () => api.capitalMandateLedger(id || ''),
    enabled: Boolean(id) && enabled,
  })
}

export function useCapitalMandatePositions(id: string | undefined, enabled: boolean) {
  return useQuery<CapitalMandatePositionsResponse>({
    queryKey: CAPITAL_MANDATE_POSITIONS_QUERY_KEY(id || ''),
    queryFn: () => api.capitalMandatePositions(id || ''),
    enabled: Boolean(id) && enabled,
  })
}
