'use server'

import { setSession, deleteSession, type SessionC3PAOUser } from '@/lib/auth'
import { apiLogin } from '@/lib/api-client'
import { authenticateLocalUser } from '@/lib/local-auth'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' }
  }

  // Try local admin auth first
  try {
    const localUser = await authenticateLocalUser(email, password)
    if (localUser) {
      const user: SessionC3PAOUser = {
        id: localUser.id,
        email: localUser.email,
        name: localUser.name,
        c3paoId: '',
        c3paoName: '',
        isLeadAssessor: false,
        status: 'ACTIVE',
      }
      await setSession(user, '', true)
      return { success: true, isLocalAdmin: true }
    }
  } catch {
    // Local auth failed, continue to Go API
  }

  // Fall back to Go API auth
  try {
    const response = await apiLogin(email, password)

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
    return { success: false, error: 'Invalid email or password' }
  }
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
