/**
 * Edge-compatible auth utilities for middleware
 *
 * ONLY contains JWT verification. No Node.js-only dependencies (no better-sqlite3, etc.)
 * to keep the Edge Function bundle size small.
 */

import { jwtVerify } from 'jose'

function getSecretKey(): string {
  const secret = process.env.AUTH_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL SECURITY ERROR: AUTH_SECRET environment variable is not set in production.'
      )
    }
    return 'development-only-insecure-key-do-not-use-in-production'
  }

  return secret
}

function getKey(): Uint8Array {
  return new TextEncoder().encode(getSecretKey())
}

export type SessionC3PAOUser = {
  id: string
  email: string
  name: string
  c3paoId: string
  c3paoName: string
  isLeadAssessor: boolean
  status: string
}

export type C3PAOSessionPayload = {
  c3paoUser: SessionC3PAOUser
  saasToken: string
  expires: string
}

/**
 * Decrypt C3PAO JWT session (edge-compatible)
 */
export async function decryptC3PAOSession(input: string): Promise<C3PAOSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, getKey(), {
      algorithms: ['HS256'],
    })
    return payload as unknown as C3PAOSessionPayload
  } catch {
    return null
  }
}
