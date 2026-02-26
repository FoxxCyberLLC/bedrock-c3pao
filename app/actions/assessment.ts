'use server'

import { requireAuth } from '@/lib/auth'
import {
  fetchFindings,
  createFinding,
  updateFinding,
  createNote,
  fetchNotes,
  type FindingView,
  type NoteView,
} from '@/lib/api-client'

async function getToken(): Promise<string> {
  const session = await requireAuth()
  if (!session) throw new Error('Unauthorized')
  return session.apiToken
}

export async function saveAssessmentFinding(input: {
  engagementId: string
  controlId?: string
  requirementId?: string
  objectiveId?: string
  determination: string | null | undefined
  assessmentMethods?: string[]
  findingText?: string | null
  objectiveEvidence?: string | null
  deficiency?: string | null
  recommendation?: string | null
  riskLevel?: string | null
  findingId?: string
  version?: number
  // Additional fields from assessment components
  methodInterview?: boolean
  methodExamine?: boolean
  methodTest?: boolean
  finding?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const token = await getToken()
    const reqId = input.controlId || input.requirementId || ''

    let result
    if (input.findingId) {
      // Update existing finding
      result = await updateFinding(input.engagementId, input.findingId, {
        determination: input.determination || undefined,
        methodInterview: input.methodInterview,
        methodExamine: input.methodExamine,
        methodTest: input.methodTest,
        finding: input.findingText || input.finding || undefined,
        objectiveEvidence: input.objectiveEvidence || undefined,
        deficiency: input.deficiency || undefined,
        recommendation: input.recommendation || undefined,
        riskLevel: input.riskLevel || undefined,
      }, token)
    } else {
      // Create new finding
      result = await createFinding(input.engagementId, {
        requirementId: reqId,
        determination: input.determination || 'NOT_ASSESSED',
        methodInterview: input.methodInterview,
        methodExamine: input.methodExamine,
        methodTest: input.methodTest,
        finding: input.findingText || input.finding || undefined,
        objectiveEvidence: input.objectiveEvidence || undefined,
        deficiency: input.deficiency || undefined,
        recommendation: input.recommendation || undefined,
        riskLevel: input.riskLevel || undefined,
      }, token)
    }

    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save finding' }
  }
}

export async function getAssessmentFindings(engagementId: string): Promise<{ success: boolean; data?: FindingView[]; error?: string }> {
  try {
    const token = await getToken()
    const findings = await fetchFindings(engagementId, token)
    return { success: true, data: findings }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load findings' }
  }
}

export async function updateAssessorNotes(input: {
  engagementId: string
  requirementStatusId: string
  assessmentNotes: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken()
    await createNote(input.engagementId, input.assessmentNotes, token)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save notes' }
  }
}

export async function getAssessmentNotes(engagementId: string): Promise<{ success: boolean; data?: NoteView[]; error?: string }> {
  try {
    const token = await getToken()
    const notes = await fetchNotes(engagementId, token)
    return { success: true, data: notes }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load notes' }
  }
}
