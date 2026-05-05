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

interface SignChallengeInput {
  challenge: string
}

export interface WebAuthnAssertionPayload {
  id: string
  rawId: string
  type: string
  response: Record<string, unknown>
}

// Step-up authentication for mandate signing. Backend /draft already issued
// the challenge bound to user + payload hash, so we don't fetch options from
// /api/auth/login/begin — we construct a minimal optionsJSON from the
// challenge in the draft response. rpId is omitted: browser defaults to the
// current hostname, which matches backend webauthn_rp_id="localhost" in dev.
// Prod deploy requires explicit env-var match (IDEAS_BACKLOG V0.5+).
async function signChallengeWithPasskey(
  input: SignChallengeInput,
): Promise<WebAuthnAssertionPayload> {
  const optionsJSON = {
    challenge: input.challenge,
    userVerification: 'required' as const,
    timeout: 60_000,
  }

  const assertion = await startAuthentication({
    optionsJSON: optionsJSON as unknown as PublicKeyCredentialRequestOptionsJSON,
  })

  return {
    id: assertion.id,
    rawId: assertion.rawId,
    type: assertion.type,
    response: assertion.response as unknown as Record<string, unknown>,
  }
}

export function signMandateWithPasskey(
  input: SignChallengeInput,
): Promise<WebAuthnAssertionPayload> {
  return signChallengeWithPasskey(input)
}

export function signDealWithPasskey(input: SignChallengeInput): Promise<WebAuthnAssertionPayload> {
  return signChallengeWithPasskey(input)
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
