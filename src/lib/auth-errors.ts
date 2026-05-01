import { ApiError } from './api-client'

export function getWebAuthnErrorMessage(err: unknown): string | null {
  if (!(err instanceof Error)) return null

  if (err.name === 'NotAllowedError') {
    return 'Passkey was canceled or timed out.'
  }
  if (err.name === 'NotSupportedError') {
    return 'Your browser does not support passkeys. Please use a modern browser.'
  }
  if (err.message === 'Failed to fetch') {
    return 'Cannot reach the backend. Please check your connection.'
  }

  return null
}

export function getSignupApiErrorMessage(err: ApiError): string {
  if (err.statusCode === 409) {
    return 'An account with this email already exists. Try logging in instead.'
  }
  if (err.statusCode === 422) {
    return 'Please check your email format and try again.'
  }
  if (err.statusCode === 429) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (err.statusCode >= 500) {
    return 'Backend error. Please try again in a moment.'
  }
  return `Signup failed (${err.statusCode}). Please try again.`
}

export function getLoginApiErrorMessage(err: ApiError): string {
  if (err.statusCode === 401) {
    return 'Authentication failed. Please verify the email and try again.'
  }
  if (err.statusCode === 404) {
    return 'No account found for this email. Try signing up.'
  }
  if (err.statusCode === 422) {
    return 'Please check your email format and try again.'
  }
  if (err.statusCode === 429) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (err.statusCode >= 500) {
    return 'Backend error. Please try again in a moment.'
  }
  return `Login failed (${err.statusCode}). Please try again.`
}

export function getSignupErrorMessage(err: unknown): string {
  const webauthnMsg = getWebAuthnErrorMessage(err)
  if (webauthnMsg) return webauthnMsg

  if (err instanceof ApiError) {
    return getSignupApiErrorMessage(err)
  }

  if (err instanceof Error && err.name === 'InvalidStateError') {
    return 'A passkey for this account already exists on this device.'
  }

  return 'Signup failed. Please try again.'
}

export function getLoginErrorMessage(err: unknown): string {
  const webauthnMsg = getWebAuthnErrorMessage(err)
  if (webauthnMsg) return webauthnMsg

  if (err instanceof ApiError) {
    return getLoginApiErrorMessage(err)
  }

  return 'Login failed. Please try again.'
}
