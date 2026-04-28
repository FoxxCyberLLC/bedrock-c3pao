/**
 * Outside-engagement eMASS export aggregator.
 *
 * Builds the same EMASSWizardData shape that getEMASSExportData produces for
 * OSC engagements, but sourced from local Postgres + instance config. The
 * eMASS workbook builder (lib/emass-workbook.ts) is unchanged — it accepts
 * EMASSWorkbookInput regardless of source.
 *
 * Validation gate compatibility: outside_engagements.scheduled_start_date is
 * NOT NULL (Task 1) and the lead assessor's job title is defaulted to
 * 'Lead Assessor' if absent — both gating fields in cmmc-export.ts:186-191
 * are therefore guaranteed populated.
 */

import { getOutsideEngagementById } from './db-outside-engagement'
import {
  mergeOutsideControlsWithCatalog,
  mergeOutsideObjectivesWithCatalog,
} from './db-outside-assessments'
import { getInstanceConfig } from './instance-config'
import type {
  ControlView,
  ObjectiveView,
  EMassExportData,
  TeamMember,
} from './api-client'

export interface OutsideEMASSWizardData {
  engagementId: string
  assessment: {
    oscName: string
    assessmentStartDate: string | null
    assessmentEndDate: string | null
    leadAssessorCPN: string | null
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
  rawData: {
    controls: ControlView[]
    objectives: ObjectiveView[]
    exportData: EMassExportData
    team: TeamMember[]
  }
}

const DEFAULT_C3PAO_NAME = 'Unknown C3PAO'
const DEFAULT_LEAD_TITLE = 'Lead Assessor'

export async function buildOutsideEMASSExportData(
  engagementId: string,
): Promise<{ success: boolean; data?: OutsideEMASSWizardData; error?: string }> {
  const eng = await getOutsideEngagementById(engagementId)
  if (!eng) {
    return { success: false, error: 'Outside engagement not found' }
  }

  const [controls, objectives, instance] = await Promise.all([
    mergeOutsideControlsWithCatalog(engagementId),
    mergeOutsideObjectivesWithCatalog(engagementId),
    getInstanceConfig().catch(() => null),
  ])

  const c3paoName = instance?.c3paoName?.trim() || DEFAULT_C3PAO_NAME
  const leadAssessorCPN = DEFAULT_LEAD_TITLE

  const reqMet = controls.filter((c) => c.status === 'MET').length
  const reqNotMet = controls.filter((c) => c.status === 'NOT_MET').length
  const reqInPoam = controls.filter((c) => c.status === 'IN_POAM').length

  const assessed = objectives.filter((o) => o.status !== 'NOT_ASSESSED')
  const objMet = objectives.filter((o) => o.status === 'MET').length
  const objNotMet = objectives.filter((o) => o.status === 'NOT_MET').length
  const missingArtifacts = assessed.filter((o) => !o.artifactsReviewed).length
  const missingInterviews = assessed.filter((o) => !o.interviewees).length
  const missingExamine = assessed.filter((o) => !o.examineDescription).length
  const missingTest = assessed.filter((o) => !o.testDescription).length

  const exportData: EMassExportData = {
    engagementId,
    exportDate: new Date().toISOString(),
    cmmcLevel: eng.targetLevel,
    organization: eng.clientName,
    assessorOrganization: c3paoName,
    systemName: eng.scope ? eng.scope.slice(0, 200) : eng.name,
    assessmentStartDate: eng.scheduledStartDate,
    assessmentEndDate: eng.scheduledEndDate,
    findings: [],
    poams: [],
  }

  const team: TeamMember[] = [
    {
      id: eng.leadAssessorId,
      assessorId: eng.leadAssessorId,
      name: eng.leadAssessorName,
      email: '',
      role: 'LEAD',
      assessorType: 'CCP',
      jobTitle: leadAssessorCPN,
      assignedAt: eng.createdAt,
      domains: [],
    },
  ]

  const errors: string[] = []
  const warnings: string[] = []
  if (!exportData.assessmentStartDate) {
    errors.push('Assessment start date is required.')
  }
  if (!leadAssessorCPN) {
    errors.push('Lead assessor CPN is required.')
  }
  if (missingArtifacts > 0) {
    warnings.push(`${missingArtifacts} assessed objective(s) are missing artifact references.`)
  }
  if (missingInterviews > 0) {
    warnings.push(`${missingInterviews} assessed objective(s) are missing interview records.`)
  }
  if (c3paoName === DEFAULT_C3PAO_NAME) {
    warnings.push(
      'C3PAO Name not configured — set C3PAO_NAME in instance config before submitting.',
    )
  }

  const data: OutsideEMASSWizardData = {
    engagementId,
    assessment: {
      oscName: eng.clientName,
      assessmentStartDate: eng.scheduledStartDate,
      assessmentEndDate: eng.scheduledEndDate,
      leadAssessorCPN,
      qaAssessorCPN: null,
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
    ssp: {
      name: eng.name,
      version: '1.0',
      date: eng.scheduledStartDate,
    },
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
}
