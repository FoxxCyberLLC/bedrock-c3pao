/**
 * Pure shape helpers for the engagement control-detail view. Lives in lib/
 * (NOT under app/actions/) because app/actions/engagements.ts has
 * `'use server'` at the top — every export from a Server Actions module
 * must be an async function. These helpers are sync, so they cannot live
 * there once exported.
 *
 * Consumers:
 *   - app/actions/engagements.ts (OSC engagement control detail)
 *   - lib/db-outside-control-detail.ts (outside engagement control detail)
 */

import type { ControlView, EvidenceView, ObjectiveView } from '@/lib/api-client'

type ObjectiveCompliance = 'NOT_ASSESSED' | 'MET' | 'NOT_MET' | 'NOT_APPLICABLE'

const OBJECTIVE_COMPLIANCE_VALUES: ReadonlySet<string> = new Set([
  'NOT_ASSESSED',
  'MET',
  'NOT_MET',
  'NOT_APPLICABLE',
])

export function narrowObjectiveStatus(s: string | null | undefined): ObjectiveCompliance {
  if (s && OBJECTIVE_COMPLIANCE_VALUES.has(s)) return s as ObjectiveCompliance
  return 'NOT_ASSESSED'
}

type InheritedNarrow = 'NONE' | 'PARTIAL' | 'FULL'

const INHERITED_VALUES: ReadonlySet<string> = new Set(['NONE', 'PARTIAL', 'FULL'])

export function narrowInherited(s: string | null | undefined): InheritedNarrow | null {
  if (!s) return null
  return INHERITED_VALUES.has(s) ? (s as InheritedNarrow) : null
}

export function toOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Group objectives by requirementId so they can be attached to controls. */
export function groupObjectivesByRequirement(
  objectives: ObjectiveView[],
): Map<string, ObjectiveView[]> {
  const map = new Map<string, ObjectiveView[]>()
  for (const obj of objectives) {
    const list = map.get(obj.requirementId) || []
    list.push(obj)
    map.set(obj.requirementId, list)
  }
  return map
}

/**
 * Shape a flat ControlView into the nested RequirementStatus the UI expects.
 * Status / inheritedStatus narrowed via guards; officialAssessedAt parsed to
 * Date; evidence mapped to {createdAt: Date, ...}; dependentESPId set to null
 * (UI-managed, not persisted by the backend in v1).
 */
export function shapeControl(
  c: ControlView,
  objectivesMap?: Map<string, ObjectiveView[]>,
  evidenceData?: EvidenceView[],
) {
  const objs = objectivesMap?.get(c.requirementId) || []
  const controlEvidence = (evidenceData || [])
    .filter((ev) => (ev.requirementIds || []).includes(c.requirementId))
    .map((ev) => ({
      id: ev.id,
      fileName: ev.fileName,
      fileUrl: ev.fileUrl,
      mimeType: ev.mimeType,
      fileSize: ev.fileSize,
      description: ev.description,
      createdAt: toOptionalDate(ev.uploadedAt) ?? new Date(0),
    }))
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
      objectives: objs.map((o) => ({
        id: o.id,
        objectiveId: o.objectiveId,
        objectiveReference: o.objectiveReference,
        description: o.description,
        questionsForOSC: o.nistQuestionsForOSC || null,
        assessorQuestionsForOSC: o.assessorQuestionsForOSC || null,
        sortOrder: 0,
        statuses: [
          {
            id: o.id,
            status: narrowObjectiveStatus(o.status),
            assessmentNotes: o.assessmentNotes,
            evidenceDescription: o.evidenceDescription,
            implementationStatement: o.implementationStatement,
            officialAssessment: o.officialAssessment,
            officialAssessorId: o.officialAssessorId,
            officialAssessedAt: toOptionalDate(o.officialAssessedAt),
            version: o.version,
            artifactsReviewed: o.artifactsReviewed,
            interviewees: o.interviewees,
            examineDescription: o.examineDescription,
            testDescription: o.testDescription,
            timeToAssessMinutes: o.timeToAssessMinutes,
            inheritedStatus: narrowInherited(o.inheritedStatus),
            dependentESPId: null,
            assessorQuestionsForOSC: o.assessorQuestionsForOSC || null,
          },
        ],
        oscStatuses: [
          {
            status: o.oscStatus,
            inheritedStatus: o.oscInheritedStatus,
            implementationStatement: o.oscImplementationStatement,
            evidenceDescription: o.oscEvidenceDescription,
            assessmentNotes: o.oscAssessmentNotes,
            policyReference: o.oscPolicyReference,
            procedureReference: o.oscProcedureReference,
            responsibilityDescription: o.oscResponsibilityDescription,
          },
        ],
        evidenceMappings: o.evidenceMappings ?? [],
        espMappings: o.espMappings ?? [],
      })),
    },
    evidence: controlEvidence,
  }
}
