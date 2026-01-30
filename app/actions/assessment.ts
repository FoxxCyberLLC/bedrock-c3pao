'use server'

import { requireAuth } from '@/lib/auth'
import { upsertFinding, getFindings, getFinding, enqueueSync, logAudit } from '@/lib/db'
import { v4 as uuidv4 } from 'crypto'

interface SaveFindingInput {
  engagementId: string
  controlId: string
  objectiveId?: string
  determination: string | null
  assessmentMethods: string[]
  findingText: string | null
  objectiveEvidence: string | null
  deficiency: string | null
  recommendation: string | null
  riskLevel: string | null
}

export async function saveAssessmentFinding(input: SaveFindingInput): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const existingFinding = getFinding(input.engagementId, input.controlId, session.c3paoUser.id)
    const id = existingFinding?.id || crypto.randomUUID()
    const version = (existingFinding?.version || 0) + 1

    upsertFinding({
      id,
      engagement_id: input.engagementId,
      control_id: input.controlId,
      objective_id: input.objectiveId || null,
      assessor_id: session.c3paoUser.id,
      determination: input.determination,
      assessment_methods: JSON.stringify(input.assessmentMethods),
      finding_text: input.findingText,
      objective_evidence: input.objectiveEvidence,
      deficiency: input.deficiency,
      recommendation: input.recommendation,
      risk_level: input.riskLevel,
      version,
    })

    // Queue for sync to SaaS
    enqueueSync({
      entity_type: 'finding',
      entity_id: id,
      engagement_id: input.engagementId,
      action: existingFinding ? 'update' : 'create',
      payload: JSON.stringify({
        id,
        controlId: input.controlId,
        objectiveId: input.objectiveId,
        determination: input.determination,
        assessmentMethods: input.assessmentMethods,
        findingText: input.findingText,
        objectiveEvidence: input.objectiveEvidence,
        deficiency: input.deficiency,
        recommendation: input.recommendation,
        riskLevel: input.riskLevel,
        version,
        engagementId: input.engagementId,
      }),
    })

    logAudit({
      assessor_id: session.c3paoUser.id,
      assessor_email: session.c3paoUser.email,
      action: existingFinding ? 'FINDING_UPDATED' : 'FINDING_CREATED',
      resource: 'AssessmentFinding',
      resource_id: id,
      details: JSON.stringify({ controlId: input.controlId, determination: input.determination }),
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save finding' }
  }
}

export async function getAssessmentFindings(engagementId: string): Promise<{ success: boolean; data?: ReturnType<typeof getFindings>; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const findings = getFindings(engagementId)
    return { success: true, data: findings }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load findings' }
  }
}

// Assessor notes for a specific control
export async function updateAssessorNotes(input: {
  engagementId: string
  requirementStatusId: string
  assessmentNotes: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    // Store notes as a finding with a special "notes" determination
    const id = `notes:${input.requirementStatusId}:${session.c3paoUser.id}`

    upsertFinding({
      id,
      engagement_id: input.engagementId,
      control_id: input.requirementStatusId,
      objective_id: null,
      assessor_id: session.c3paoUser.id,
      determination: 'ASSESSOR_NOTES',
      assessment_methods: null,
      finding_text: input.assessmentNotes,
      objective_evidence: null,
      deficiency: null,
      recommendation: null,
      risk_level: null,
      version: 1,
    })

    enqueueSync({
      entity_type: 'finding',
      entity_id: id,
      engagement_id: input.engagementId,
      action: 'update',
      payload: JSON.stringify({
        id,
        controlId: input.requirementStatusId,
        type: 'assessor_notes',
        assessmentNotes: input.assessmentNotes,
        engagementId: input.engagementId,
      }),
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save notes' }
  }
}
