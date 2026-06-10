/**
 * Login throttling / account lockout (NIST 800-171 AC.L2-3.1.8).
 *
 * Failed attempts are keyed by identity (email) only — behind the start.js
 * HTTPS proxy every client collapses to 127.0.0.1, so per-IP throttling would
 * either lock everyone out or be useless. After MAX_FAILED_ATTEMPTS consecutive
 * failures the account is locked for LOCK_WINDOW_MS. The lock is time-based and
 * AUTO-EXPIRES, so the sole local admin of an offline VDI can never be
 * permanently locked out.
 *
 * Operator escape hatch (force-unlock, e.g. a locked sole admin):
 *   docker compose exec db psql -U c3pao -d c3pao -c "DELETE FROM login_attempts;"
 */

import { query } from './db'

export const MAX_FAILED_ATTEMPTS = 5
export const LOCK_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export interface LockState {
  locked: boolean
  retryAfterSec?: number
}

/** Whether `email` is currently locked out, and for how much longer. */
export async function isLockedOut(email: string): Promise<LockState> {
  const res = await query('SELECT locked_until FROM login_attempts WHERE email = $1', [email])
  const row = res.rows[0] as { locked_until: string | null } | undefined
  if (!row || !row.locked_until) return { locked: false }

  const remainingMs = new Date(row.locked_until).getTime() - Date.now()
  if (remainingMs <= 0) return { locked: false } // expired → self-heal
  return { locked: true, retryAfterSec: Math.ceil(remainingMs / 1000) }
}

/**
 * Record a failed login. Increments the consecutive-failure count and locks the
 * account once it reaches the threshold. A failure that arrives after a prior
 * lock has expired starts a fresh count.
 */
export async function recordFailedLogin(email: string): Promise<void> {
  const res = await query('SELECT failed_count, locked_until FROM login_attempts WHERE email = $1', [
    email,
  ])
  const row = res.rows[0] as { failed_count: number; locked_until: string | null } | undefined

  const now = Date.now()
  const priorLockExpired =
    !!row?.locked_until && new Date(row.locked_until).getTime() < now

  const count = !row || priorLockExpired ? 1 : row.failed_count + 1
  const lockedUntil =
    count >= MAX_FAILED_ATTEMPTS ? new Date(now + LOCK_WINDOW_MS).toISOString() : null

  await query(
    `INSERT INTO login_attempts (email, failed_count, locked_until, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (email)
     DO UPDATE SET failed_count = $2, locked_until = $3, updated_at = NOW()`,
    [email, count, lockedUntil],
  )
}

/** Clear all recorded failures for `email` (called on a successful login). */
export async function clearLoginAttempts(email: string): Promise<void> {
  await query('DELETE FROM login_attempts WHERE email = $1', [email])
}
