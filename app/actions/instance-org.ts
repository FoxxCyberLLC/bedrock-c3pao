'use server'

import { requireAuth } from '@/lib/auth'
import {
  fetchInstanceOrg,
  fetchInstanceUsers,
  createInstanceUser,
  updateInstanceUser,
  deleteInstanceUser,
  type InstanceOrgDetail,
  type C3PAOUserItem,
} from '@/lib/api-client'

async function requireAdmin() {
  const session = await requireAuth()
  if (!session?.isLocalAdmin) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function getInstanceOrg(): Promise<{
  success: boolean
  data?: InstanceOrgDetail
  error?: string
}> {
  try {
    await requireAdmin()
    const org = await fetchInstanceOrg()
    return { success: true, data: org }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load organization',
    }
  }
}

export async function getInstanceUsers(): Promise<{
  success: boolean
  data?: C3PAOUserItem[]
  error?: string
}> {
  try {
    await requireAdmin()
    const users = await fetchInstanceUsers()
    return { success: true, data: users }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load users',
    }
  }
}

export async function addInstanceUser(formData: FormData): Promise<{
  success: boolean
  data?: C3PAOUserItem
  error?: string
}> {
  try {
    await requireAdmin()

    const body = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      phone: (formData.get('phone') as string) || undefined,
      jobTitle: (formData.get('jobTitle') as string) || undefined,
      ccaNumber: (formData.get('ccaNumber') as string) || undefined,
      ccpNumber: (formData.get('ccpNumber') as string) || undefined,
      isLeadAssessor: formData.get('isLeadAssessor') === 'true',
    }

    const user = await createInstanceUser(body)
    return { success: true, data: user }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user',
    }
  }
}

export async function updateInstanceUserStatus(
  userId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    await updateInstanceUser(userId, { status })
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user status',
    }
  }
}

export async function removeInstanceUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    await deleteInstanceUser(userId)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    }
  }
}
