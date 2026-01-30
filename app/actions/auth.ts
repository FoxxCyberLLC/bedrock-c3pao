'use server'

import { setSession, deleteSession, type SessionC3PAOUser } from '@/lib/auth'
import { authenticateAssessor } from '@/lib/api-client'
import { logAudit } from '@/lib/db'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' }
  }

  try {
    const response = await authenticateAssessor(email, password)

    const user: SessionC3PAOUser = {
      id: response.assessor.id,
      email: response.assessor.email,
      name: response.assessor.name,
      c3paoId: response.assessor.c3paoId,
      c3paoName: response.assessor.c3paoName,
      isLeadAssessor: response.assessor.isLeadAssessor,
      status: response.assessor.status,
    }

    await setSession(user, response.token)

    logAudit({
      assessor_id: user.id,
      assessor_email: user.email,
      action: 'LOGIN',
      resource: 'Authentication',
    })

    return { success: true }
  } catch (error) {
    logAudit({
      assessor_id: 'unknown',
      assessor_email: email,
      action: 'LOGIN_FAILED',
      resource: 'Authentication',
      details: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown' }),
    })

    return { success: false, error: 'Invalid email or password' }
  }
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
