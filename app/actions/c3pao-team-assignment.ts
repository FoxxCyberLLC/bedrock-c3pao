'use server'

import { requireAuth } from '@/lib/auth'
import { fetchTeam, fetchAvailableAssessors, addTeamMember as apiAddTeam, updateTeamMemberRole, removeTeamMember, checkCOIAssignment, setAssessorDomains } from '@/lib/api-client'

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

    // CAP v2.0 Preliminary Proceedings COI guard (Task 10):
    // Check for active conflicts of interest before assigning. An
    // "active_conflict" is a hard block; "unknown_org" (pre-migration
    // Customer rows) surfaces as a warning so the lead can verify manually.
    try {
      const coi = await checkCOIAssignment(engId, uId, session.apiToken)
      if (coi.hasActive) {
        const types = coi.disclosures.map((d) => d.disclosureType).join(', ')
        return {
          success: false,
          error: `COI conflict — assessor has active ${types} disclosure for this organization`,
          coiConflict: true,
          disclosures: coi.disclosures,
        }
      }
      if (coi.reason === 'unknown_org') {
        return {
          success: false,
          error: 'COI check unavailable — this customer predates the organization migration. Verify manually via the COI register before proceeding.',
          coiWarning: true,
        }
      }
    } catch (coiErr) {
      // If the COI service itself fails (not a conflict), log and continue —
      // blocking all assignments on infrastructure errors would be worse than
      // missing a rare conflict.
      console.warn('COI check failed, proceeding with assignment:', coiErr)
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
    await setAssessorDomains(engagementId, assessorId, familyCodes, session.apiToken)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to assign domains' }
  }
}

/**
 * Replace the full set of CMMC family domains assigned to a single team
 * member on an engagement. The Go API endpoint is a PUT (full replacement),
 * not an incremental add/remove — pass the complete desired set.
 */
export async function setMemberDomains(
  engagementId: string,
  assessorId: string,
  familyCodes: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    await setAssessorDomains(engagementId, assessorId, familyCodes, session.apiToken)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update domains' }
  }
}
