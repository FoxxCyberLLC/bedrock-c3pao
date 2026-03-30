'use server'

import { requireAuth } from '@/lib/auth'
import { getAllConfig } from '@/lib/config'
import {
  getLocalAdmin,
  listLocalUsers,
  createLocalUser,
  updateLocalUser,
  resetLocalUserPassword,
  deleteLocalUser,
  countAdmins,
  type LocalUser,
} from '@/lib/local-auth'

async function requireAdmin() {
  const session = await requireAuth()
  if (!session?.isLocalAdmin) {
    throw new Error('Unauthorized')
  }
  return session
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getAdminSettings() {
  try {
    await requireAdmin()
  } catch {
    return { success: false as const, error: 'Unauthorized' }
  }

  const config = getAllConfig()
  const admin = getLocalAdmin()

  return {
    success: true as const,
    data: {
      apiUrl: config.BEDROCK_API_URL || '',
      c3paoName: config.C3PAO_NAME || '',
      c3paoId: config.C3PAO_ID || '',
      activatedAt: config.ACTIVATED_AT || '',
      forceHttps: config.FORCE_HTTPS || 'true',
      adminEmail: admin?.email || '',
      adminName: admin?.name || '',
    },
  }
}

// ---------------------------------------------------------------------------
// User Management
// ---------------------------------------------------------------------------

export async function getUsers(): Promise<{
  success: boolean
  data?: LocalUser[]
  error?: string
}> {
  try {
    await requireAdmin()
    return { success: true, data: listLocalUsers() }
  } catch {
    return { success: false, error: 'Unauthorized' }
  }
}

export async function createUser(params: {
  email: string
  name: string
  password: string
  role: 'admin' | 'user'
}): Promise<{ success: boolean; data?: LocalUser; error?: string }> {
  try {
    await requireAdmin()

    if (!params.email || !params.name || !params.password) {
      return { success: false, error: 'All fields are required' }
    }
    if (params.password.length < 12) {
      return { success: false, error: 'Password must be at least 12 characters' }
    }

    const user = createLocalUser(params.email, params.name, params.password, params.role)
    return { success: true, data: user }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create user'
    if (msg.includes('UNIQUE constraint')) {
      return { success: false, error: 'A user with this email already exists' }
    }
    return { success: false, error: msg }
  }
}

export async function editUser(params: {
  id: string
  name?: string
  email?: string
  role?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()

    if (params.role && params.role !== 'admin') {
      const admins = countAdmins()
      const currentUser = (await requireAuth())!
      // Prevent demoting the last admin or yourself
      if (admins <= 1 && params.id === currentUser.c3paoUser.id) {
        return { success: false, error: 'Cannot demote the last admin' }
      }
    }

    const updated = updateLocalUser(params.id, params)
    if (!updated) return { success: false, error: 'User not found' }
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update user'
    if (msg.includes('UNIQUE constraint')) {
      return { success: false, error: 'A user with this email already exists' }
    }
    return { success: false, error: msg }
  }
}

export async function resetPassword(params: {
  id: string
  newPassword: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()

    if (!params.newPassword || params.newPassword.length < 12) {
      return { success: false, error: 'Password must be at least 12 characters' }
    }

    const updated = resetLocalUserPassword(params.id, params.newPassword)
    if (!updated) return { success: false, error: 'User not found' }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to reset password' }
  }
}

export async function removeUser(params: {
  id: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAdmin()

    // Prevent deleting yourself
    if (params.id === session.c3paoUser.id) {
      return { success: false, error: 'Cannot delete your own account' }
    }

    // Prevent deleting the last admin
    const admins = countAdmins()
    if (admins <= 1) {
      // Check if we're deleting an admin
      const { getLocalUserById } = await import('@/lib/local-auth')
      const user = getLocalUserById(params.id)
      if (user?.role === 'admin') {
        return { success: false, error: 'Cannot delete the last admin account' }
      }
    }

    const deleted = deleteLocalUser(params.id)
    if (!deleted) return { success: false, error: 'User not found' }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete user' }
  }
}
