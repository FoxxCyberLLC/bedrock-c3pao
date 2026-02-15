'use server'

import { setSession, deleteSession, type SessionC3PAOUser } from '@/lib/auth'
import { apiLogin } from '@/lib/api-client'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' }
  }

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
  } catch (error) {
    return { success: false, error: 'Invalid email or password' }
  }
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
