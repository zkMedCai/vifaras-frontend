import { jwtDecode } from 'jwt-decode'

export interface AccessTokenPayload {
  sub: string
  tier: 0 | 1 | 2
  kind: 'access'
  iat: number
  exp: number
}

export function decodeAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwtDecode<AccessTokenPayload>(token)
  } catch {
    return null
  }
}

export function getTierFromToken(token: string | null): 0 | 1 | 2 | null {
  if (!token) return null
  return decodeAccessToken(token)?.tier ?? null
}
