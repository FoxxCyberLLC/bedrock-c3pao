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
  fetchSnapshots,
  fetchC3PAOUsers,
  startCorrectionOpportunity,
  resumeReEvaluation,
  type EngagementSummary,
  type ControlView,
  type ObjectiveView,
  type EvidenceView,
  type POAMView,
  type SSPView,
  type C3PAOUserItem,
  type AssessmentSnapshotView,
} from '@/lib/api-client'

async function getToken(): Promise<string> {
  const session = await requireAuth()
  if (!session) throw new Error('Unauthorized')
  return session.apiToken
}

// checkEngagementStatus fetches only the status and assessmentResult for an engagement.
// Used by the layout to determine if a redirect is needed before rendering any sub-page.
// Returns null if the engagement is not found or the request fails.
export async function checkEngagementStatus(
  id: string,
): Promise<{ status: string; assessmentResult: string | null } | null> {
  try {
    const token = await getToken()
    const detail = await fetchEngagementDetail(id, token)
    return {
      status: (detail.status as string) || '',
      assessmentResult: (detail.assessmentResult as string) || null,
    }
  } catch {
    return null
  }
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

    // Short-circuit for COMPLETED: the layout will redirect before this page renders,
    // but if called directly return minimal data to avoid 5 failing parallel fetches.
    if (detail.status === 'COMPLETED') {
      return {
        success: true,
        data: { id: detail.id, status: 'COMPLETED', assessmentResult: detail.assessmentResult || null },
        accessLevel: detail.accessLevel as string,
      }
    }

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
    const requirementStatuses = (controlsData as ControlView[]).map(c => shapeControl(c, objMap, evidenceData as EvidenceView[]))

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

export async function getEngagementObjectives(engagementId: string): Promise<{ success: boolean; data?: ObjectiveView[]; error?: string }> {
  try {
    const token = await getToken()
    const objectives = await fetchObjectives(engagementId, token)
    return { success: true, data: objectives }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load objectives' }
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
function shapeControl(c: ControlView, objectivesMap?: Map<string, ObjectiveView[]>, evidenceData?: EvidenceView[]) {
  const objs = objectivesMap?.get(c.requirementId) || []
  const controlEvidence = (evidenceData || []).filter(ev =>
    (ev.requirementIds || []).includes(c.requirementId)
  )
  return {
    id: c.requirementStatusId || c.id,
    status: c.status || 'NOT_STARTED',
    implementationNotes: c.implementationNotes,
    implementationType: c.implementationType,
    processOwner: c.processOwner,
    assessmentNotes: c.assessmentNotes || null,
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
        questionsForOSC: o.nistQuestionsForOSC || null,
        assessorQuestionsForOSC: o.assessorQuestionsForOSC || null,
        sortOrder: 0,
        // C3PAO assessment (engagement-scoped)
        statuses: [{
          id: o.id,
          status: o.status || 'NOT_ASSESSED',
          assessmentNotes: o.assessmentNotes,
          evidenceDescription: o.evidenceDescription,
          implementationStatement: o.implementationStatement,
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
          assessorQuestionsForOSC: o.assessorQuestionsForOSC || null,
        }],
        // OSC self-assessment context (package-scoped)
        oscStatuses: [{
          status: o.oscStatus,
          inheritedStatus: o.oscInheritedStatus,
          implementationStatement: o.oscImplementationStatement,
          evidenceDescription: o.oscEvidenceDescription,
          assessmentNotes: o.oscAssessmentNotes,
          policyReference: o.oscPolicyReference,
          procedureReference: o.oscProcedureReference,
          responsibilityDescription: o.oscResponsibilityDescription,
        }],
        // OSC-authored per-objective mappings (read-only on assessor side)
        evidenceMappings: o.evidenceMappings ?? [],
        espMappings: o.espMappings ?? [],
      })),
    },
    evidence: controlEvidence,
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
    const [engagements, controls, objectivesResult, evidenceResult] = await Promise.all([
      fetchAssessments(token),
      fetchControls(engagementId, token),
      fetchObjectives(engagementId, token).catch(() => [] as ObjectiveView[]),
      fetchEvidence(engagementId, token).catch(() => [] as EvidenceView[]),
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
        control: shapeControl(control, objMap, evidenceResult),
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

// Shape controls + objectives into the `families[]` structure the SSP long-form renderer expects.
// The SSP is an OSC-authored document, so objective-level fields (implementation statement,
// policy/procedure references, evidence description) come from the OSC self-assessment row,
// not the c3pao assessor verdict.
interface SSPFamily {
  id: string
  code: string
  name: string
  requirements: Array<{
    id: string
    requirementId: string
    title: string
    basicRequirement: string
    derivedRequirement: string | null
    objectives: Array<{
      id: string
      objectiveReference: string
      description: string
      statuses: Array<{
        id: string
        status: string
        implementationStatement: string | null
        policyReference: string | null
        procedureReference: string | null
        evidenceDescription: string | null
        inheritedStatus: string | null
        responsibilityDescription: string | null
      }>
    }>
    statuses: Array<{
      id: string
      status: string
      implementationNotes: string | null
      implementationType: string | null
      processOwner: string | null
      processOperator: string | null
      occurrence: string | null
      technologyInUse: string | null
      documentationLocation: string | null
      supportingPolicy: string | null
      supportingStandard: string | null
      supportingProcedure: string | null
    }>
  }>
}

function shapeFamiliesForSSP(
  controls: ControlView[],
  objectives: ObjectiveView[],
): SSPFamily[] {
  const objMap = groupObjectivesByRequirement(objectives)
  const familyMap = new Map<string, SSPFamily>()

  for (const c of controls) {
    let family = familyMap.get(c.familyCode)
    if (!family) {
      family = {
        id: c.familyCode,
        code: c.familyCode,
        name: c.familyName,
        requirements: [],
      }
      familyMap.set(c.familyCode, family)
    }

    const objs = objMap.get(c.requirementId) || []
    family.requirements.push({
      id: c.id,
      requirementId: c.requirementId,
      title: c.title,
      basicRequirement: c.basicRequirement,
      derivedRequirement: null,
      objectives: objs.map(o => ({
        id: o.id,
        objectiveReference: o.objectiveReference,
        description: o.description,
        // SSP context → OSC self-assessment fields
        statuses: [{
          id: o.id,
          status: o.oscStatus || 'NOT_ASSESSED',
          implementationStatement: o.oscImplementationStatement,
          policyReference: o.oscPolicyReference,
          procedureReference: o.oscProcedureReference,
          evidenceDescription: o.oscEvidenceDescription,
          inheritedStatus: o.inheritedStatus,
          responsibilityDescription: o.oscResponsibilityDescription,
        }],
      })),
      statuses: [{
        id: c.requirementStatusId || c.id,
        status: c.status || 'NOT_STARTED',
        implementationNotes: c.implementationNotes,
        implementationType: c.implementationType,
        processOwner: c.processOwner,
        processOperator: null,
        occurrence: null,
        technologyInUse: null,
        documentationLocation: null,
        supportingPolicy: null,
        supportingStandard: null,
        supportingProcedure: null,
      }],
    })
  }

  return Array.from(familyMap.values())
}

export async function getSSPBundleForC3PAO(
  engagementId: string,
): Promise<{ success: boolean; data?: { ssp: SSPView; families: SSPFamily[] }; error?: string }> {
  try {
    const token = await getToken()
    const [sspResult, controlsResult, objectivesResult] = await Promise.allSettled([
      fetchSSP(engagementId, token),
      fetchControls(engagementId, token),
      fetchObjectives(engagementId, token),
    ])

    if (sspResult.status !== 'fulfilled') {
      const err = sspResult.reason
      return { success: false, error: err instanceof Error ? err.message : 'Failed to load SSP' }
    }

    const controls = controlsResult.status === 'fulfilled' ? controlsResult.value : []
    const objectives = objectivesResult.status === 'fulfilled' ? objectivesResult.value : []
    const families = shapeFamiliesForSSP(controls, objectives)

    return { success: true, data: { ssp: sspResult.value, families } }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load SSP bundle' }
  }
}

// ---- Snapshot + correction-cycle server actions ----
//
// Actions return the standard { success; data?; error? } envelope. They do
// NOT call revalidatePath — the calling component handles refresh via
// router.refresh() after a successful response. Single refresh point avoids
// double invalidation.

export async function listSnapshotsAction(
  engagementId: string,
): Promise<{ success: boolean; data?: AssessmentSnapshotView[]; error?: string }> {
  try {
    const token = await getToken()
    const data = await fetchSnapshots(engagementId, token)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load snapshots' }
  }
}

export async function giveCorrectionOpportunityAction(
  engagementId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken()
    await startCorrectionOpportunity(engagementId, token)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to start correction opportunity' }
  }
}

export async function resumeReEvaluationAction(
  engagementId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken()
    await resumeReEvaluation(engagementId, token)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to resume re-evaluation' }
  }
}
