/**
 * Authentication System
 *
 * Local JWT session management for the standalone C3PAO client.
 * Assessor credentials are validated against the Go API on login.
 * Session stores the Go API JWT for subsequent API calls.
 */

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secretKey = process.env.AUTH_SECRET || 'development-only-insecure-key-do-not-use-in-production'
const key = new TextEncoder().encode(secretKey)

const COOKIE_NAME = 'bedrock_c3pao_session'
const SESSION_DURATION_HOURS = 8

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
 * Encrypt session data into JWT
 */
export async function encryptSession(payload: Record<string, unknown>): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(key)
}

/**
 * Decrypt JWT session
 */
export async function decryptSession(input: string): Promise<C3PAOSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    })
    return payload as unknown as C3PAOSessionPayload
  } catch {
    return null
  }
}

/**
 * Get the current session from cookies
 */
export async function getSession(): Promise<C3PAOSessionPayload | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)?.value
  if (!session) return null
  return await decryptSession(session)
}

/**
 * Set session cookie after successful Go API authentication
 */
export async function setSession(user: SessionC3PAOUser, apiToken: string): Promise<void> {
  const expires = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000)

  const session = await encryptSession({
    c3paoUser: user,
    apiToken,
    expires: expires.toISOString(),
  })

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, session, {
    expires,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  })
}

/**
 * Delete session (logout)
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete({
    name: COOKIE_NAME,
    path: '/',
  })
}

/**
 * Require authentication — returns session or null
 */
export async function requireAuth(): Promise<C3PAOSessionPayload | null> {
  const session = await getSession()
  if (!session) return null

  // Check expiry
  if (new Date(session.expires) <= new Date()) {
    return null
  }

  return session
}

/**
 * Get the Go API token from the current session
 */
export async function getApiToken(): Promise<string | null> {
  const session = await getSession()
  return session?.apiToken || null
}
