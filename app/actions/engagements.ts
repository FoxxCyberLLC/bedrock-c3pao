'use server'

import { requireAuth } from '@/lib/auth'
import {
  fetchAssessments,
  fetchEngagementDetail,
  fetchControls,
  fetchEvidence,
  fetchPOAMs,
  fetchSSP,
  fetchTeam,
  fetchSTIGs,
  fetchObjectives,
  fetchC3PAOUsers,
  type EngagementSummary,
  type ControlView,
  type ObjectiveView,
  type EvidenceView,
  type POAMView,
  type SSPView,
  type C3PAOUserItem,
} from '@/lib/api-client'

async function getToken(): Promise<string> {
  const session = await requireAuth()
  if (!session) throw new Error('Unauthorized')
  return session.apiToken
}

export async function getC3PAOEngagements(): Promise<{ success: boolean; data?: EngagementSummary[]; error?: string }> {
  try {
    const token = await getToken()
    const engagements = await fetchAssessments(token)
    return { success: true, data: engagements }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load engagements' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEngagementById(id: string): Promise<{ success: boolean; data?: any; accessLevel?: string; error?: string }> {
  try {
    const token = await getToken()
    const detail = await fetchEngagementDetail(id, token) as Record<string, any>

    // Fetch controls, objectives, evidence, POAMs, and SSP in parallel
    const [controls, objectives, evidence, poams, ssp] = await Promise.allSettled([
      fetchControls(id, token),
      fetchObjectives(id, token),
      fetchEvidence(id, token),
      fetchPOAMs(id, token),
      fetchSSP(id, token),
    ])

    const controlsData = controls.status === 'fulfilled' ? controls.value : []
    const objectivesData = objectives.status === 'fulfilled' ? objectives.value : []
    const evidenceData = evidence.status === 'fulfilled' ? evidence.value : []
    const poamsData = poams.status === 'fulfilled' ? poams.value : []
    const sspData = ssp.status === 'fulfilled' ? ssp.value : null

    // Group objectives by requirementId and build nested control shapes
    const objMap = groupObjectivesByRequirement(objectivesData as ObjectiveView[])
    const requirementStatuses = (controlsData as ControlView[]).map(c => shapeControl(c, objMap))

    // Shape into the nested structure EngagementDetail component expects
    const shaped = {
      id: detail.id,
      status: detail.status,
      assessmentType: (detail.assessmentType as string) || 'CERTIFICATION',
      targetLevel: detail.targetLevel,
      customerNotes: detail.customerNotes || null,
      assessmentNotes: detail.assessmentNotes || null,
      assessmentResult: detail.assessmentResult || null,
      resultNotes: detail.resultNotes || null,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
      acceptedDate: detail.acceptedDate || null,
      actualStartDate: detail.actualStartDate || null,
      actualCompletionDate: detail.actualCompletionDate || null,
      assessmentModeActive: detail.assessmentModeActive || false,
      assessmentModeStartedAt: detail.assessmentModeStartedAt || null,
      accessLevel: detail.accessLevel,
      atoPackage: {
        id: detail.atoPackageId,
        name: detail.packageName || 'Unknown Package',
        cmmcLevel: detail.packageCmmcLevel || detail.targetLevel,
        description: null,
        organization: {
          id: '',
          name: detail.organizationName || 'Unknown Organization',
        },
        requirementStatuses,
        poams: poamsData || [],
        evidence: evidenceData || [],
        ssp: sspData || null,
        assets: [],
        externalServiceProviders: [],
      },
      leadAssessor: detail.leadAssessorName
        ? { id: detail.leadAssessorId || '', name: detail.leadAssessorName, email: '' }
        : null,
    }

    return {
      success: true,
      data: shaped,
      accessLevel: detail.accessLevel,
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load engagement' }
  }
}

export async function getEngagementControls(engagementId: string): Promise<{ success: boolean; data?: ControlView[]; error?: string }> {
  try {
    const token = await getToken()
    const controls = await fetchControls(engagementId, token)
    return { success: true, data: controls }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load controls' }
  }
}

export async function getEngagementEvidence(engagementId: string): Promise<{ success: boolean; data?: EvidenceView[]; error?: string }> {
  try {
    const token = await getToken()
    const evidence = await fetchEvidence(engagementId, token)
    return { success: true, data: evidence }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load evidence' }
  }
}

export async function getEngagementPoams(engagementId: string): Promise<{ success: boolean; data?: POAMView[]; error?: string }> {
  try {
    const token = await getToken()
    const poams = await fetchPOAMs(engagementId, token)
    return { success: true, data: poams }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load POA&Ms' }
  }
}

export async function getEngagementSSP(engagementId: string): Promise<{ success: boolean; data?: SSPView; error?: string }> {
  try {
    const token = await getToken()
    const ssp = await fetchSSP(engagementId, token)
    return { success: true, data: ssp }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load SSP' }
  }
}

export async function getC3PAOTeam(): Promise<{ success: boolean; data?: C3PAOUserItem[]; error?: string }> {
  try {
    const token = await getToken()
    const users = await fetchC3PAOUsers(token)
    return { success: true, data: users }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load team' }
  }
}

export async function getCurrentC3PAOUser(): Promise<{ success: boolean; data?: { id: string; isLeadAssessor: boolean }; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    return {
      success: true,
      data: {
        id: session.c3paoUser.id,
        isLeadAssessor: session.c3paoUser.isLeadAssessor,
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get user' }
  }
}

export async function getEngagementTeam(engagementId: string): Promise<{ success: boolean; data?: unknown[]; error?: string }> {
  try {
    const token = await getToken()
    const team = await fetchTeam(engagementId, token)
    return { success: true, data: team }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load team' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEngagementStigs(engagementId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const token = await getToken()
    const stigs = await fetchSTIGs(engagementId, token)
    return { success: true, data: stigs }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load STIGs' }
  }
}

// Group objectives by requirementId for attachment to controls
function groupObjectivesByRequirement(objectives: ObjectiveView[]): Map<string, ObjectiveView[]> {
  const map = new Map<string, ObjectiveView[]>()
  for (const obj of objectives) {
    const list = map.get(obj.requirementId) || []
    list.push(obj)
    map.set(obj.requirementId, list)
  }
  return map
}

// Helper: shape a flat ControlView into the nested RequirementStatus the UI expects
function shapeControl(c: ControlView, objectivesMap?: Map<string, ObjectiveView[]>) {
  const objs = objectivesMap?.get(c.requirementId) || []
  return {
    id: c.id,
    status: c.status || 'NOT_STARTED',
    implementationNotes: c.implementationNotes,
    implementationType: c.implementationType,
    processOwner: c.processOwner,
    assessmentNotes: null,
    requirement: {
      id: c.id,
      requirementId: c.requirementId,
      title: c.title,
      basicRequirement: c.basicRequirement,
      derivedRequirement: null,
      discussion: '',
      family: {
        id: c.familyCode,
        code: c.familyCode,
        name: c.familyName,
      },
      objectives: objs.map(o => ({
        id: o.id,
        objectiveId: o.objectiveId,
        objectiveReference: o.objectiveReference,
        description: o.description,
        questionsForOSC: o.assessorQuestionsForOSC,
        sortOrder: 0,
        statuses: [{
          id: o.id,
          status: o.status || 'NOT_ASSESSED',
          assessmentNotes: o.assessmentNotes,
          evidenceDescription: o.evidenceDescription,
          officialAssessment: o.officialAssessment,
          officialAssessorId: o.officialAssessorId,
          officialAssessedAt: o.officialAssessedAt,
          version: o.version,
          artifactsReviewed: o.artifactsReviewed,
          interviewees: o.interviewees,
          examineDescription: o.examineDescription,
          testDescription: o.testDescription,
          timeToAssessMinutes: o.timeToAssessMinutes,
          inheritedStatus: o.inheritedStatus,
        }],
      })),
    },
    evidence: [],
  }
}

// Helper: shape a flat EngagementSummary into the nested engagement object the UI expects
function shapeEngagementForControl(e: EngagementSummary) {
  return {
    id: e.id,
    status: e.status,
    assessmentModeActive: e.assessmentModeActive,
    atoPackage: {
      id: e.atoPackageId,
      name: e.packageName || 'Unknown Package',
      organization: {
        id: '',
        name: e.organizationName || 'Unknown Organization',
      },
      externalServiceProviders: [],
    },
  }
}

// Control detail for individual assessment page
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEngagementControlDetail(engagementId: string, controlId: string): Promise<{
  success: boolean
  data?: {
    engagement: any
    control: any
    navigation: { prevId: string | null; prevName: string | null; nextId: string | null; nextName: string | null; currentIndex: number; total: number }
  }
  error?: string
}> {
  try {
    const token = await getToken()
    const [engagements, controls, objectivesResult] = await Promise.all([
      fetchAssessments(token),
      fetchControls(engagementId, token),
      fetchObjectives(engagementId, token).catch(() => [] as ObjectiveView[]),
    ])

    const engagement = engagements.find(e => e.id === engagementId)
    if (!engagement) {
      return { success: false, error: 'Engagement not found' }
    }

    const controlIndex = controls.findIndex(c => c.id === controlId)
    if (controlIndex === -1) {
      return { success: false, error: 'Control not found' }
    }

    const objMap = groupObjectivesByRequirement(objectivesResult)
    const control = controls[controlIndex]
    const prev = controlIndex > 0 ? controls[controlIndex - 1] : null
    const next = controlIndex < controls.length - 1 ? controls[controlIndex + 1] : null

    return {
      success: true,
      data: {
        engagement: shapeEngagementForControl(engagement),
        control: shapeControl(control, objMap),
        navigation: {
          prevId: prev?.id || null,
          prevName: prev?.requirementId || null,
          nextId: next?.id || null,
          nextName: next?.requirementId || null,
          currentIndex: controlIndex + 1,
          total: controls.length,
        },
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load control detail' }
  }
}
