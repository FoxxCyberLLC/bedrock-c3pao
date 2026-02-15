/**
 * Edge-compatible auth utilities for middleware
 *
 * ONLY contains JWT verification. No Node.js-only dependencies
 * to keep the Edge Function bundle size small.
 */

import { jwtVerify } from 'jose'

// In production, AUTH_SECRET must be set via env. For dev/test, use the fallback.
// Note: Edge runtime in Next.js may not have access to .env at runtime,
// so we inline the fallback to prevent middleware auth failures.
const AUTH_SECRET_FALLBACK = 'development-only-insecure-key-do-not-use-in-production'

function getSecretKey(): string {
  return process.env.AUTH_SECRET || AUTH_SECRET_FALLBACK
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
  apiToken: string
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
