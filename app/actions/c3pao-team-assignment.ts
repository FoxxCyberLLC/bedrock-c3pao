'use server'

import { requireAuth } from '@/lib/auth'
import { fetchTeam, fetchAvailableAssessors, addTeamMember as apiAddTeam, updateTeamMemberRole, removeTeamMember } from '@/lib/api-client'

export async function getEngagementTeam(engagementId: string) {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const team = await fetchTeam(engagementId, session.apiToken)
    return { success: true, data: team }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load team' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAvailableAssessors(engagementId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const assessors = await fetchAvailableAssessors(engagementId, session.apiToken)
    return { success: true, data: assessors as any[] }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load assessors' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function assignAssessorToEngagement(dataOrEngagementId: string | Record<string, any>, userId?: string, role: string = 'ASSESSOR') {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    let engId: string
    let uId: string
    let r: string
    if (typeof dataOrEngagementId === 'string') {
      engId = dataOrEngagementId
      uId = userId!
      r = role
    } else {
      engId = dataOrEngagementId.engagementId as string
      uId = (dataOrEngagementId.assessorId || dataOrEngagementId.userId) as string
      r = (dataOrEngagementId.role as string) || 'ASSESSOR'
    }
    await apiAddTeam(engId, { assessorId: uId, role: r }, session.apiToken)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to assign assessor' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function removeAssessorFromEngagement(dataOrEngagementId: string | Record<string, any>, assessorId?: string) {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    let engId: string
    let aId: string
    if (typeof dataOrEngagementId === 'string') {
      engId = dataOrEngagementId
      aId = assessorId!
    } else {
      engId = dataOrEngagementId.engagementId as string
      aId = dataOrEngagementId.assessorId as string
    }
    await removeTeamMember(engId, aId, session.apiToken)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to remove assessor' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateAssessorRole(dataOrEngagementId: string | Record<string, any>, assessorId?: string, role?: string) {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    let engId: string
    let aId: string
    let r: string
    if (typeof dataOrEngagementId === 'string') {
      engId = dataOrEngagementId
      aId = assessorId!
      r = role!
    } else {
      engId = dataOrEngagementId.engagementId as string
      aId = dataOrEngagementId.assessorId as string
      r = dataOrEngagementId.role as string
    }
    await updateTeamMemberRole(engId, aId, r, session.apiToken)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update role' }
  }
}

export async function assignControlsToAssessor(engagementId: string, assessorId: string, familyCodes: string[]) {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const { setAssessorDomains } = await import('@/lib/api-client')
    await setAssessorDomains(engagementId, assessorId, familyCodes, session.apiToken)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to assign domains' }
  }
}
