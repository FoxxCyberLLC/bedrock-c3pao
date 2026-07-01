'use server'

import { setSession, deleteSession, type SessionC3PAOUser } from '@/lib/auth'
import { apiLogin } from '@/lib/api-client'
import { authenticateLocalUser } from '@/lib/local-auth'
import { getInstanceConfig } from '@/lib/instance-config'
import { isOffline } from '@/lib/mode'
import { isLockedOut, recordFailedLogin, clearLoginAttempts } from '@/lib/login-attempts'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' }
  }

  // Throttle: reject while locked out, even with correct credentials. Returned
  // (never thrown) so the result reaches the caller. Keyed by email — generic
  // wording preserves anti-enumeration (a never-seen email is simply unlocked).
  const lock = await isLockedOut(email)
  if (lock.locked) {
    const minutes = Math.ceil((lock.retryAfterSec ?? 0) / 60)
    return {
      success: false,
      locked: true,
      error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    }
  }

  // Try local account auth first. Local accounts are the ONLY auth path offline;
  // assessor-role accounts get an assessment session, operator roles get /admin.
  try {
    const localUser = await authenticateLocalUser(email, password)
    if (localUser) {
      await clearLoginAttempts(email)

      // Assessor accounts (air-gapped): identity from local instance config, never
      // the Go API. Lead status is a LOCAL property of the account — imported OSC
      // data can never confer or elevate it.
      if (localUser.role === 'assessor' || localUser.role === 'lead_assessor') {
        const config = await getInstanceConfig()
        const assessor: SessionC3PAOUser = {
          id: localUser.id,
          email: localUser.email,
          name: localUser.name,
          c3paoId: config?.c3paoId ?? '',
          c3paoName: config?.c3paoName ?? '',
          isLeadAssessor: localUser.role === 'lead_assessor',
          status: 'ACTIVE',
        }
        await setSession(assessor, '', false)
        return { success: true }
      }

      // Operator (admin / user) → instance management only.
      const operator: SessionC3PAOUser = {
        id: localUser.id,
        email: localUser.email,
        name: localUser.name,
        c3paoId: '',
        c3paoName: '',
        isLeadAssessor: false,
        status: 'ACTIVE',
      }
      await setSession(operator, '', true)
      return { success: true, isLocalAdmin: true }
    }
  } catch {
    // Local auth failed, continue to Go API (online only).
  }

  // Air-gapped build: there is no remote login. Fail closed.
  if (isOffline()) {
    await recordFailedLogin(email)
    return { success: false, error: 'Invalid email or password' }
  }

  // Fall back to Go API auth
  try {
    const response = await apiLogin(email, password)
    await clearLoginAttempts(email)

    const user: SessionC3PAOUser = {
      id: response.userId,
      email: response.email,
      name: response.name,
      c3paoId: response.orgId,
      c3paoName: response.orgName || '',
      isLeadAssessor: response.isLeadAssessor || false,
      status: 'ACTIVE',
    }

    await setSession(user, response.token)

    return { success: true }
  } catch {
    // Both auth paths failed — count this attempt toward the lockout threshold.
    await recordFailedLogin(email)
    return { success: false, error: 'Invalid email or password' }
  }
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
