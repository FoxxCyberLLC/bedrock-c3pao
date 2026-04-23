'use server'

import { requireAuth } from '@/lib/auth'
import {
  fetchEMassExport,
  fetchControls,
  fetchObjectives,
  fetchSnapshotObjectives,
  fetchSSP,
  fetchTeam,
  type ControlView,
  type ObjectiveView,
  type ObjectiveStatusSnapshotView,
  type EMassExportData,
  type TeamMember,
} from '@/lib/api-client'

export interface EMASSWizardData {
  engagementId: string
  assessment: {
    oscName: string
    assessmentStartDate: string | null
    assessmentEndDate: string | null
    /** Lead assessor identifier (jobTitle used as CPN proxy when available) */
    leadAssessorCPN: string | null
    /** QA assessor identifier (jobTitle used as CPN proxy when available) */
    qaAssessorCPN: string | null
    executiveSummary: string
    standardsAcceptance: string
    hashValue: string
    hashedDataList: string
  }
  requirements: {
    total: number
    met: number
    notMet: number
    inPoam: number
  }
  objectives: {
    total: number
    assessed: number
    met: number
    notMet: number
    missingArtifacts: number
    missingInterviews: number
    missingExamine: number
    missingTest: number
  }
  ssp: {
    name: string | null
    version: string
    date: string | null
  }
  validation: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
  /** Raw data arrays for client-side export generation */
  rawData: {
    controls: ControlView[]
    objectives: ObjectiveView[]
    exportData: EMassExportData
    team: TeamMember[]
  }
}

/**
 * mergeSnapshotScoring overrides scoring fields on live ObjectiveView rows
 * with values from a snapshot. Keeps the catalog metadata (objectiveReference,
 * description, requirementId, etc.) from the live objectives — those don't
 * change across correction cycles — and substitutes the assessor's scoring
 * fields with what the snapshot recorded.
 */
function mergeSnapshotScoring(
  liveObjectives: ObjectiveView[],
  snapshot: ObjectiveStatusSnapshotView[],
): ObjectiveView[] {
  if (snapshot.length === 0) return liveObjectives
  const byObjectiveId = new Map<string, ObjectiveStatusSnapshotView>()
  for (const s of snapshot) byObjectiveId.set(s.objectiveId, s)
  return liveObjectives.map((live) => {
    const s = byObjectiveId.get(live.objectiveId)
    if (!s) return live
    return {
      ...live,
      status: s.status,
      assessmentNotes: s.assessmentNotes,
      evidenceDescription: s.evidenceDescription,
      inheritedStatus: s.inheritedStatus,
      artifactsReviewed: s.artifactsReviewed,
      interviewees: s.interviewees,
      examineDescription: s.examineDescription,
      testDescription: s.testDescription,
      timeToAssessMinutes: s.timeToAssessMinutes,
      policyReference: s.policyReference,
      procedureReference: s.procedureReference,
      implementationStatement: s.implementationStatement,
      responsibilityDescription: s.responsibilityDescription,
    }
  })
}

export async function getEMASSExportData(
  engagementId: string,
  snapshotId?: string,
): Promise<{ success: boolean; data?: EMASSWizardData; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const token = session.apiToken

    // Fetch all data sources in parallel — failures degrade gracefully.
    // When snapshotId is provided, ALSO fetch the snapshot's per-objective
    // rows; those override the scoring fields on the live objectives so the
    // export reflects that historical moment.
    const [
      exportResult,
      controlsResult,
      objectivesResult,
      sspResult,
      teamResult,
      snapshotObjectivesResult,
    ] = await Promise.allSettled([
      fetchEMassExport(engagementId, token),
      fetchControls(engagementId, token),
      fetchObjectives(engagementId, token),
      fetchSSP(engagementId, token).catch(() => null),
      fetchTeam(engagementId, token).catch(() => []),
      snapshotId
        ? fetchSnapshotObjectives(engagementId, snapshotId, token).catch(
            () => [] as ObjectiveStatusSnapshotView[],
          )
        : Promise.resolve([] as ObjectiveStatusSnapshotView[]),
    ])

    const exportData = exportResult.status === 'fulfilled' ? exportResult.value : null
    const controls: ControlView[] =
      controlsResult.status === 'fulfilled' ? controlsResult.value : []
    const liveObjectives: ObjectiveView[] =
      objectivesResult.status === 'fulfilled' ? objectivesResult.value : []
    const ssp = sspResult.status === 'fulfilled' ? sspResult.value : null
    const team = teamResult.status === 'fulfilled' ? teamResult.value : []
    const snapshotObjectives: ObjectiveStatusSnapshotView[] =
      snapshotObjectivesResult.status === 'fulfilled' ? snapshotObjectivesResult.value : []

    const objectives = snapshotId
      ? mergeSnapshotScoring(liveObjectives, snapshotObjectives)
      : liveObjectives

    if (!exportData) {
      return { success: false, error: 'Failed to load export data from backend' }
    }

    // ---- Requirements counts ----
    const reqMet = controls.filter((c) => c.status === 'MET').length
    const reqNotMet = controls.filter((c) => c.status === 'NOT_MET').length
    const reqInPoam = controls.filter((c) => c.status === 'IN_POAM').length

    // ---- Objectives counts ----
    const assessed = objectives.filter((o) => o.status !== 'NOT_ASSESSED')
    const objMet = objectives.filter((o) => o.status === 'MET').length
    const objNotMet = objectives.filter((o) => o.status === 'NOT_MET').length
    const missingArtifacts = assessed.filter((o) => !o.artifactsReviewed).length
    const missingInterviews = assessed.filter((o) => !o.interviewees).length
    const missingExamine = assessed.filter((o) => !o.examineDescription).length
    const missingTest = assessed.filter((o) => !o.testDescription).length

    // ---- Team: lead and QA assessors ----
    const leadAssessor = team.find((m) => m.role === 'LEAD')
    const qaAssessor = team.find((m) => m.role === 'QA' || m.role === 'ASSESSOR')
    const leadAssessorCPN = leadAssessor?.jobTitle || null
    const qaAssessorCPN = qaAssessor?.jobTitle || null

    // ---- SSP details ----
    const sspData = {
      name: ssp?.systemName || null,
      version: ssp?.version || '1.0',
      date: ssp?.lastModified || null,
    }

    // ---- Validation ----
    const errors: string[] = []
    const warnings: string[] = []
    if (!exportData.assessmentStartDate) {
      errors.push('Assessment start date is required — set it in the engagement settings.')
    }
    if (!leadAssessorCPN) {
      errors.push('Lead assessor CPN (job title) is required — assign a lead assessor with a job title set.')
    }
    if (!qaAssessorCPN) {
      warnings.push('QA assessor CPN not set — recommended before submission.')
    }
    if (missingArtifacts > 0) {
      warnings.push(`${missingArtifacts} assessed objective(s) are missing artifact references.`)
    }
    if (missingInterviews > 0) {
      warnings.push(`${missingInterviews} assessed objective(s) are missing interview records.`)
    }

    const data: EMASSWizardData = {
      engagementId,
      assessment: {
        oscName: exportData.organization,
        assessmentStartDate: exportData.assessmentStartDate,
        assessmentEndDate: exportData.assessmentEndDate,
        leadAssessorCPN,
        qaAssessorCPN,
        executiveSummary: '',
        standardsAcceptance: '',
        hashValue: '',
        hashedDataList: '',
      },
      requirements: {
        total: controls.length,
        met: reqMet,
        notMet: reqNotMet,
        inPoam: reqInPoam,
      },
      objectives: {
        total: objectives.length,
        assessed: assessed.length,
        met: objMet,
        notMet: objNotMet,
        missingArtifacts,
        missingInterviews,
        missingExamine,
        missingTest,
      },
      ssp: sspData,
      validation: {
        isValid: errors.length === 0,
        errors,
        warnings,
      },
      rawData: {
        controls,
        objectives,
        exportData,
        team,
      },
    }

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load eMASS export data',
    }
  }
}
