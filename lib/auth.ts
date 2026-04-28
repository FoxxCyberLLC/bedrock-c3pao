/**
 * Authentication System
 *
 * Local JWT session management for the standalone C3PAO client.
 * Assessor credentials are validated against the Go API on login.
 * Session stores the Go API JWT for subsequent API calls.
 */

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

function getSecretKey(): string {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET environment variable is required')
  return s
}

function getKey(): Uint8Array {
  return new TextEncoder().encode(getSecretKey())
}

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
  isLocalAdmin?: boolean
}

/**
 * Encrypt session data into JWT
 */
export async function encryptSession(payload: Record<string, unknown>): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(getKey())
}

/**
 * Decrypt JWT session
 */
export async function decryptSession(input: string): Promise<C3PAOSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, getKey(), {
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
export async function setSession(user: SessionC3PAOUser, apiToken: string, isLocalAdmin = false): Promise<void> {
  const expires = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000)

  const session = await encryptSession({
    c3paoUser: user,
    apiToken,
    expires: expires.toISOString(),
    isLocalAdmin,
  })

  const isSecure = process.env.FORCE_HTTPS === 'true' || process.env.NODE_ENV === 'production'

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, session, {
    expires,
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
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

export type RequireLeadAssessorResult = {
  session: C3PAOSessionPayload | null
  isLead: boolean
  error?: string
}

/**
 * Require an authenticated lead assessor for a specific engagement.
 * Fast path: `isLeadAssessor` flag set at login. Slow path: check team
 * membership via the Go API and verify the caller has role `LEAD_ASSESSOR`.
 * Either qualifier flips `isLead = true`.
 */
export async function requireLeadAssessor(
  engagementId: string,
): Promise<RequireLeadAssessorResult> {
  const session = await requireAuth()
  if (!session) return { session: null, isLead: false, error: 'Unauthorized' }

  if (session.c3paoUser.isLeadAssessor) return { session, isLead: true }

  try {
    const { fetchTeam } = await import('./api-client')
    const team = await fetchTeam(engagementId, session.apiToken)
    const isLead = team.some(
      (m) => m.assessorId === session.c3paoUser.id && m.role === 'LEAD_ASSESSOR',
    )
    return { session, isLead }
  } catch {
    return { session, isLead: false, error: 'Failed to verify lead assessor status' }
  }
}

/**
 * Require the lead assessor of an OUTSIDE engagement. Reads
 * outside_engagements.lead_assessor_id directly via the local Postgres helper
 * — never falls through to the Go API. Local admin role qualifies.
 */
export async function requireOutsideLeadAssessor(
  engagementId: string,
): Promise<RequireLeadAssessorResult> {
  const session = await requireAuth()
  if (!session) return { session: null, isLead: false, error: 'Unauthorized' }

  if (session.isLocalAdmin) return { session, isLead: true }

  try {
    const { getOutsideEngagementLeadId } = await import('./db-outside-engagement')
    const leadId = await getOutsideEngagementLeadId(engagementId)
    return { session, isLead: leadId === session.c3paoUser.id }
  } catch {
    return {
      session,
      isLead: false,
      error: 'Failed to verify outside engagement lead status',
    }
  }
}

/**
 * Kind-aware lead-assessor check. Dispatches to the appropriate backend.
 */
export async function requireLeadAssessorByKind(
  engagementId: string,
  kind: import('./outside-engagement-types').EngagementKind,
): Promise<RequireLeadAssessorResult> {
  if (kind === 'outside_osc') return requireOutsideLeadAssessor(engagementId)
  return requireLeadAssessor(engagementId)
}
