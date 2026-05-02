import type { paths } from './api-types'
import { useAuthStore } from './auth-store'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public body: unknown,
  ) {
    super(`API Error ${statusCode}`)
    this.name = 'ApiError'
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options

  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  }

  const accessToken = useAuthStore.getState().accessToken
  if (accessToken) {
    mergedHeaders.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: mergedHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })

  if (!response.ok) {
    let errorBody: unknown = null
    try {
      errorBody = await response.json()
    } catch {
      errorBody = await response.text().catch(() => null)
    }
    throw new ApiError(response.status, errorBody)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

type JsonResponse<P extends keyof paths, M extends keyof paths[P]> = paths[P][M] extends {
  responses: { 200: { content: { 'application/json': infer R } } }
}
  ? R
  : never

type JsonRequest<P extends keyof paths, M extends keyof paths[P]> = paths[P][M] extends {
  requestBody: { content: { 'application/json': infer R } }
}
  ? R
  : never

export type HealthResponse = JsonResponse<'/api/health', 'get'>

export type RegisterBeginRequest = JsonRequest<'/api/auth/register/begin', 'post'>
export type RegisterCompleteRequest = JsonRequest<'/api/auth/register/complete', 'post'>
export type LoginBeginRequest = JsonRequest<'/api/auth/login/begin', 'post'>
export type LoginCompleteRequest = JsonRequest<'/api/auth/login/complete', 'post'>
export type RefreshRequest = JsonRequest<'/api/auth/refresh', 'post'>

export type BeginResponse = JsonResponse<'/api/auth/register/begin', 'post'>
export type TokenResponse = JsonResponse<'/api/auth/register/complete', 'post'>
export type RefreshResponse = JsonResponse<'/api/auth/refresh', 'post'>

export type AgentsMineResponse = JsonResponse<'/api/agents/mine', 'get'>

export type MandateDraftRequest = JsonRequest<'/api/mandates/draft', 'post'>
export type MandateDraftResponse = JsonResponse<'/api/mandates/draft', 'post'>

export type MandateSubmitRequest = JsonRequest<'/api/mandates/submit', 'post'>
export type MandateSubmitResponse = JsonResponse<'/api/mandates/submit', 'post'>

export type IntentListResponse = JsonResponse<'/api/intents', 'get'>
export type IntentResponse = JsonResponse<'/api/intents/{intent_id}', 'get'>
export type CreateIntentRequest = JsonRequest<'/api/intents', 'post'>
export type CreateIntentResponse = JsonResponse<'/api/intents', 'post'>
export type UpdateIntentRequest = JsonRequest<'/api/intents/{intent_id}', 'patch'>
export type UpdateIntentResponse = JsonResponse<'/api/intents/{intent_id}', 'patch'>
export type CancelIntentResponse = JsonResponse<'/api/intents/{intent_id}', 'delete'>

export const api = {
  health: () => request<HealthResponse>('/api/health'),

  signupBegin: (body: RegisterBeginRequest) =>
    request<BeginResponse>('/api/auth/register/begin', {
      method: 'POST',
      body,
    }),
  signupComplete: (body: RegisterCompleteRequest) =>
    request<TokenResponse>('/api/auth/register/complete', {
      method: 'POST',
      body,
    }),
  loginBegin: (body: LoginBeginRequest) =>
    request<BeginResponse>('/api/auth/login/begin', {
      method: 'POST',
      body,
    }),
  loginComplete: (body: LoginCompleteRequest) =>
    request<TokenResponse>('/api/auth/login/complete', {
      method: 'POST',
      body,
    }),
  refresh: (body: RefreshRequest) =>
    request<RefreshResponse>('/api/auth/refresh', {
      method: 'POST',
      body,
    }),

  agentsMine: () => request<AgentsMineResponse>('/api/agents/mine'),

  createMandateDraft: (body: MandateDraftRequest) =>
    request<MandateDraftResponse>('/api/mandates/draft', {
      method: 'POST',
      body,
    }),

  submitMandate: (body: MandateSubmitRequest) =>
    request<MandateSubmitResponse>('/api/mandates/submit', {
      method: 'POST',
      body,
    }),

  intentsList: (params?: { status?: string; side?: string; limit?: number; offset?: number }) => {
    const queryString = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : ''
    return request<IntentListResponse>(`/api/intents${queryString}`)
  },

  intentGet: (id: string) => request<IntentResponse>(`/api/intents/${id}`),

  intentCreate: (body: CreateIntentRequest) =>
    request<CreateIntentResponse>('/api/intents', {
      method: 'POST',
      body,
    }),

  intentUpdate: (id: string, body: UpdateIntentRequest) =>
    request<UpdateIntentResponse>(`/api/intents/${id}`, {
      method: 'PATCH',
      body,
    }),

  intentCancel: (id: string) =>
    request<CancelIntentResponse>(`/api/intents/${id}`, {
      method: 'DELETE',
    }),
}
