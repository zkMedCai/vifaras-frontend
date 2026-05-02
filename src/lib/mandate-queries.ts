'use client'

import { useMutation } from '@tanstack/react-query'
import { api, type MandateDraftRequest, type MandateDraftResponse } from './api-client'

export function useCreateDraft() {
  return useMutation<MandateDraftResponse, Error, MandateDraftRequest>({
    mutationFn: (body) => api.createMandateDraft(body),
  })
}
