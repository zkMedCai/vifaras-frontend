'use client'

import { useMutation } from '@tanstack/react-query'
import {
  api,
  type MandateDraftRequest,
  type MandateDraftResponse,
  type MandateSubmitRequest,
  type MandateSubmitResponse,
} from './api-client'

export function useCreateDraft() {
  return useMutation<MandateDraftResponse, Error, MandateDraftRequest>({
    mutationFn: (body) => api.createMandateDraft(body),
  })
}

export function useSubmitMandate() {
  return useMutation<MandateSubmitResponse, Error, MandateSubmitRequest>({
    mutationFn: (body) => api.submitMandate(body),
  })
}
