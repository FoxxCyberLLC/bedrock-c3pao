'use server'

import { requireAuth } from '@/lib/auth'
import {
  fetchProfile,
  updateProfile,
  updateEngagementStatus as apiUpdateEngagementStatus,
  toggleAssessmentMode,
  fetchSPRS,
  sendProposal as apiSendProposal,
  acknowledgeIntroduction as apiAcknowledgeIntroduction,
  updateObjective,
  addTeamMember as apiAddTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  fetchEvidence,
  fetchSSP,
  fetchPOAMs,
  createNote,
  fetchNotes,
} from '@/lib/api-client'
import {
  getC3PAOEngagements as _getEngagements,
  getEngagementById as _getById,
  getC3PAOTeam as _getTeam,
  getCurrentC3PAOUser as _getCurrentUser,
} from './engagements'
import { updateAssessorNotes as _updateNotes } from './assessment'

async function getToken(): Promise<string> {
  const session = await requireAuth()
  if (!session) throw new Error('Unauthorized')
  return session.apiToken
}

export async function getC3PAOEngagements() {
  return _getEngagements()
}

export async function getEngagementById(id: string) {
  return _getById(id)
}

export async function getC3PAOTeam() {
  return _getTeam()
}

export async function getCurrentC3PAOUser() {
  return _getCurrentUser()
}

export async function updateAssessorNotes(...args: Parameters<typeof _updateNotes>) {
  return _updateNotes(...args)
}

// ---- Profile ----

export async function getC3PAOProfile(): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const token = await getToken()
    const profile = await fetchProfile(token)
    return { success: true, data: profile }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load profile' }
  }
}

export async function updateC3PAOProfile(data: FormData | Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const token = await getToken()
    // If FormData, convert to plain object
    let payload: Record<string, unknown>
    if (data instanceof FormData) {
      payload = {}
      data.forEach((value, key) => {
        // Handle multi-value fields (e.g., specialties, authorizedLevels)
        if (payload[key] !== undefined) {
          if (Array.isArray(payload[key])) {
            (payload[key] as unknown[]).push(value)
          } else {
            payload[key] = [payload[key], value]
          }
        } else {
          payload[key] = value
        }
      })
    } else {
      payload = data
    }
    const updated = await updateProfile(payload, token)
    return { success: true, data: updated }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update profile' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateC3PAOLogo(...args: any[]): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Logo upload not yet available (S3 not implemented)' }
}

// ---- Engagement Status ----

export async function updateEngagementStatus(engagementId: string, status: string, notes?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken()
    await apiUpdateEngagementStatus(engagementId, { status, notes }, token)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update engagement status' }
  }
}

// ---- Notes ----

export async function addAssessorNotes(engagementId: string, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken()
    await createNote(engagementId, content, token)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add assessor notes' }
  }
}

// ---- Assessment Result ----

export async function recordAssessmentResult(engagementId: string, result: string | boolean, findings?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken()
    const status = typeof result === 'boolean' ? (result ? 'PASSED' : 'FAILED') : result
    await apiUpdateEngagementStatus(engagementId, { status, notes: findings }, token)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to record assessment result' }
  }
}

// ---- Assessment Mode ----

export async function startAssessment(engagementId: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const token = await getToken()
    await toggleAssessmentMode(engagementId, true, token)
    return { success: true, message: 'Assessment mode activated' }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to start assessment' }
  }
}

export async function endAssessmentMode(engagementId: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const token = await getToken()
    await toggleAssessmentMode(engagementId, false, token)
    return { success: true, message: 'Assessment mode deactivated' }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to end assessment mode' }
  }
}

// ---- SPRS Score ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function calculateEngagementSPRSScore(engagementId: string): Promise<{ success: boolean; score?: number; data?: any }> {
  try {
    const token = await getToken()
    const data = await fetchSPRS(engagementId, token)
    return { success: true, score: data.score, data }
  } catch (error) {
    return { success: false, score: 0 }
  }
}

// ---- Submission / Approval ----

export async function submitAssessmentForApproval(engagementId: string, notes?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken()
    await apiUpdateEngagementStatus(engagementId, { status: 'SUBMITTED_FOR_APPROVAL', notes }, token)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to submit assessment for approval' }
  }
}

export async function rejectAssessmentSubmission(engagementId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken()
    await apiUpdateEngagementStatus(engagementId, { status: 'IN_PROGRESS', notes: reason }, token)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to reject assessment submission' }
  }
}

// ---- Proposals & Introduction ----

export async function acknowledgeIntroduction(engagementId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken()
    await apiAcknowledgeIntroduction(engagementId, token)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to acknowledge introduction' }
  }
}

export async function sendProposal(proposalDataOrEngagementId: string | Record<string, unknown>, proposalData?: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken()
    let engId: string
    let data: Record<string, unknown>
    if (typeof proposalDataOrEngagementId === 'string') {
      engId = proposalDataOrEngagementId
      data = proposalData || {}
    } else {
      engId = proposalDataOrEngagementId.engagementId as string
      data = proposalDataOrEngagementId
    }
    await apiSendProposal(engId, data, token)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send proposal' }
  }
}

export async function declineIntroduction(engagementId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken()
    await apiUpdateEngagementStatus(engagementId, { status: 'DECLINED', notes: reason }, token)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to decline introduction' }
  }
}

// ---- Objective Updates ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function assessorUpdateObjectiveStatus(dataOrEngagementId: string | Record<string, any>, objectiveId?: string, data?: Record<string, unknown>): Promise<{ success: boolean; error?: string; conflict?: boolean }> {
  try {
    const token = await getToken()
    let engId: string
    let objId: string
    let payload: Record<string, unknown>
    if (typeof dataOrEngagementId === 'string') {
      engId = dataOrEngagementId
      objId = objectiveId!
      payload = data || {}
    } else {
      engId = dataOrEngagementId.engagementId as string
      objId = dataOrEngagementId.objectiveId as string
      payload = dataOrEngagementId
    }
    await updateObjective(engId, objId, payload, token)
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update objective status'
    const isConflict = msg.toLowerCase().includes('conflict') || msg.toLowerCase().includes('version')
    return { success: false, error: msg, conflict: isConflict }
  }
}

// ---- Team Management ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addTeamMember(dataOrEngagementId: string | Record<string, any>, userId?: string, role?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken()
    if (typeof dataOrEngagementId === 'string') {
      await apiAddTeamMember(dataOrEngagementId, { userId: userId!, role: role || 'ASSESSOR' }, token)
    } else {
      // Component passes a single object with member data — this is a team member creation, not engagement assignment
      // Use the C3PAO team management endpoint instead
      const { default: fetch } = await import('node-fetch' as string).catch(() => ({ default: globalThis.fetch }))
      const API_URL = process.env.BEDROCK_API_URL || 'http://localhost:8080'
      const response = await globalThis.fetch(`${API_URL}/api/c3pao/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(dataOrEngagementId),
      })
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ error: { message: 'Request failed' } }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error((errBody as any)?.error?.message || 'Failed to add team member')
      }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add team member' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateTeamMember(memberIdOrEngagementId: string, dataOrAssessorId: string | Record<string, any>, role?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken()
    if (typeof dataOrAssessorId === 'string') {
      // Called as (engagementId, assessorId, role)
      await updateTeamMemberRole(memberIdOrEngagementId, dataOrAssessorId, role!, token)
    } else {
      // Called as (memberId, { name, phone, ... }) — update team member profile
      const API_URL = process.env.BEDROCK_API_URL || 'http://localhost:8080'
      const response = await globalThis.fetch(`${API_URL}/api/c3pao/team/${memberIdOrEngagementId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(dataOrAssessorId),
      })
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ error: { message: 'Request failed' } }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error((errBody as any)?.error?.message || 'Failed to update team member')
      }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update team member' }
  }
}

export async function deleteTeamMember(memberIdOrEngagementId: string, assessorId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken()
    if (assessorId) {
      // Called as (engagementId, assessorId)
      await removeTeamMember(memberIdOrEngagementId, assessorId, token)
    } else {
      // Called as (memberId) — delete team member from C3PAO org
      const API_URL = process.env.BEDROCK_API_URL || 'http://localhost:8080'
      const response = await globalThis.fetch(`${API_URL}/api/c3pao/team/${memberIdOrEngagementId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ error: { message: 'Request failed' } }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error((errBody as any)?.error?.message || 'Failed to delete team member')
      }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to remove team member' }
  }
}

export async function resetTeamMemberPassword(memberId: string, newPassword?: string): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Password reset not yet available via API' }
}

// ---- Evidence Repository (read-only) ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEvidenceRepositoryForC3PAO(engagementId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const token = await getToken()
    const data = await fetchEvidence(engagementId, token)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load evidence repository' }
  }
}

// ---- SSP (read-only) ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSSPLongFormDataForC3PAO(engagementId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const token = await getToken()
    const data = await fetchSSP(engagementId, token)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load SSP data' }
  }
}

// ---- POAM (read-only) ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPOAMForC3PAO(poamId: string, engagementId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const token = await getToken()
    const poams = await fetchPOAMs(engagementId, token)
    const poam = poams.find(p => p.id === poamId)
    if (!poam) {
      return { success: false, error: 'POAM not found' }
    }
    return { success: true, data: poam }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load POAM' }
  }
}

// ---- Evidence Detail ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEvidenceDetailsForC3PAO(evidenceId: string, engagementId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const token = await getToken()
    const evidence = await fetchEvidence(engagementId, token)
    const item = evidence.find(e => e.id === evidenceId)
    if (!item) {
      return { success: false, error: 'Evidence not found' }
    }
    return { success: true, data: item }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load evidence details' }
  }
}

// Evidence download URL for C3PAO
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEvidenceDownloadUrlForC3PAO(evidenceId: string, engagementId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  return { success: false, error: 'Evidence downloads not yet available (S3 not implemented)' }
}

// ---- Assessor Notes (individual) ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addAssessorNote(engagementId: string, content: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const token = await getToken()
    const note = await createNote(engagementId, content, token)
    return { success: true, data: note }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add assessor note' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAssessorNotes(engagementId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const token = await getToken()
    const notes = await fetchNotes(engagementId, token)
    return { success: true, data: notes }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load assessor notes' }
  }
}
