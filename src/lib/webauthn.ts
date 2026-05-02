'use client'

import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/types'
import { api } from './api-client'
import { decodeAccessToken } from './jwt-decode-helper'

export async function registerNewPasskey(email: string) {
  const begin = await api.signupBegin({ email })

  const credential: RegistrationResponseJSON = await startRegistration({
    optionsJSON: begin.options as unknown as PublicKeyCredentialCreationOptionsJSON,
  })

  const tokens = await api.signupComplete({
    credential: credential as unknown as Record<string, unknown>,
    challenge_token: begin.challenge_token,
  })

  const tier = decodeAccessToken(tokens.access_token)?.tier ?? 0
  return {
    user: { id: tokens.user_id, email, tier },
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  }
}

export async function loginWithPasskey(email: string) {
  const begin = await api.loginBegin({ email })

  const credential: AuthenticationResponseJSON = await startAuthentication({
    optionsJSON: begin.options as unknown as PublicKeyCredentialRequestOptionsJSON,
  })

  const tokens = await api.loginComplete({
    credential: credential as unknown as Record<string, unknown>,
    challenge_token: begin.challenge_token,
  })

  const tier = decodeAccessToken(tokens.access_token)?.tier ?? 0
  return {
    user: { id: tokens.user_id, email, tier },
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  }
}
