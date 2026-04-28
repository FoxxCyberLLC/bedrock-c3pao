/**
 * Builds the same `{ engagement, control, navigation }` shape that
 * getEngagementControlDetail returns for OSC engagements, but sourced from
 * local Postgres for outside engagements. Reuses shapeControl + groupObjectivesByRequirement
 * exported from app/actions/engagements.ts.
 */

import { groupObjectivesByRequirement, shapeControl } from '@/app/actions/engagements'
import {
  mergeOutsideControlsWithCatalog,
  mergeOutsideObjectivesWithCatalog,
  listEvidenceForObjective,
} from './db-outside-assessments'
import { getOutsideEngagementById } from './db-outside-engagement'

/**
 * Engagement shape consumed by ControlDetailPage. Outside engagements have
 * no External Service Providers in v1 — the optional field is omitted so the
 * structural type matches ControlDetailPageProps['engagement'] without an
 * `ESP[]` declaration leaking from the consumer's local type.
 */
export interface OutsideControlDetailEngagement {
  id: string
  status: string
  assessmentModeActive: boolean
  atoPackage: {
    id: string
    name: string
    organization: { id: string; name: string } | null
  } | null
}

export interface OutsideControlDetailNavigation {
  prevId: string | null
  prevName: string | null
  nextId: string | null
  nextName: string | null
  currentIndex: number
  total: number
}

/** shapeControl's return value — matches the RequirementStatus shape ControlDetailPage consumes. */
export type OutsideControlDetailControl = ReturnType<typeof shapeControl>

export interface OutsideControlDetailResult {
  success: boolean
  data?: {
    engagement: OutsideControlDetailEngagement
    control: OutsideControlDetailControl
    navigation: OutsideControlDetailNavigation
  }
  error?: string
}

export async function getOutsideEngagementControlDetail(
  engagementId: string,
  controlId: string,
): Promise<OutsideControlDetailResult> {
  const eng = await getOutsideEngagementById(engagementId)
  if (!eng) {
    return { success: false, error: 'Outside engagement not found' }
  }

  const [controls, objectives] = await Promise.all([
    mergeOutsideControlsWithCatalog(engagementId),
    mergeOutsideObjectivesWithCatalog(engagementId),
  ])

  // controlId in outside flow is the requirementId itself (catalog id == requirement id).
  const controlIndex = controls.findIndex(
    (c) => c.id === controlId || c.requirementId === controlId,
  )
  if (controlIndex === -1) {
    return { success: false, error: 'Control not found' }
  }

  const control = controls[controlIndex]
  const objMap = groupObjectivesByRequirement(objectives)

  // Surface evidence linked to any objective in this control. This is best
  // effort — failure to resolve evidence does not break navigation.
  let evidence: Awaited<ReturnType<typeof listEvidenceForObjective>> = []
  try {
    const objIds = (objMap.get(control.requirementId) ?? []).map((o) => o.objectiveId)
    if (objIds.length > 0) {
      const lists = await Promise.all(
        objIds.map((oid) => listEvidenceForObjective(engagementId, oid)),
      )
      evidence = lists.flat()
    }
  } catch {
    evidence = []
  }

  const prev = controlIndex > 0 ? controls[controlIndex - 1] : null
  const next =
    controlIndex < controls.length - 1 ? controls[controlIndex + 1] : null

  // Engagement shape mirrors shapeEngagementForControl (private to engagements.ts).
  // No external service providers for outside engagements in v1.
  const engagementShape: OutsideControlDetailEngagement = {
    id: eng.id,
    status: eng.status,
    assessmentModeActive: false,
    atoPackage: {
      id: eng.id,
      name: eng.name,
      organization: { id: eng.id, name: eng.clientName },
    },
  }

  return {
    success: true,
    data: {
      engagement: engagementShape,
      control: shapeControl(control, objMap, evidence),
      navigation: {
        prevId: prev?.id ?? null,
        prevName: prev?.requirementId ?? null,
        nextId: next?.id ?? null,
        nextName: next?.requirementId ?? null,
        currentIndex: controlIndex + 1,
        total: controls.length,
      },
    },
  }
}
