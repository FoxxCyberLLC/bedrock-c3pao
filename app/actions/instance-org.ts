'use server'

import { z } from 'zod'
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

// H15: Input validation schema for addInstanceUser
const AddInstanceUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  ccaNumber: z.string().optional(),
  ccpNumber: z.string().optional(),
  isLeadAssessor: z.boolean().default(false),
})

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

    // H15: Validate required fields before forwarding to the API.
    // Use ?? '' for required fields so .min(1) fires with our custom error message
    // when the value is null/missing (rather than a generic Zod type error).
    const parsed = AddInstanceUserSchema.safeParse({
      name: (formData.get('name') as string) ?? '',
      email: (formData.get('email') as string) ?? '',
      password: (formData.get('password') as string) ?? '',
      phone: (formData.get('phone') as string) || undefined,
      jobTitle: (formData.get('jobTitle') as string) || undefined,
      ccaNumber: (formData.get('ccaNumber') as string) || undefined,
      ccpNumber: (formData.get('ccpNumber') as string) || undefined,
      isLeadAssessor: formData.get('isLeadAssessor') === 'true',
    })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const user = await createInstanceUser(parsed.data)
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
