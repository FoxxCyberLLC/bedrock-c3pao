/**
 * Adapter mapping an OutsideEngagement to the prop shape <EngagementDetail>
 * already expects (the Go-API-shaped object). OSC-only fields default to
 * null/empty so the engagement detail layout can render uniformly.
 *
 * This adapter is the single point of impedance-match between local-Postgres
 * outside engagements and the existing OSC-shaped UI; <EngagementDetail>
 * does NOT need to know the row originated from local Postgres.
 */

import type { OutsideEngagement } from '@/lib/outside-engagement-types'

export interface CommonEngagementShape {
  id: string
  status: string
  targetLevel: string
  startedAt: string | null
  completedAt: string | null
  description: string | null
  package: {
    id: string
    name: string
    organization: { id: string; name: string }
    evidence: ReadonlyArray<unknown>
    poams: ReadonlyArray<unknown>
  }
  leadAssessor: {
    id: string
    name: string
  } | null
}

export function outsideToCommon(eng: OutsideEngagement): CommonEngagementShape {
  return {
    id: eng.id,
    status: eng.status,
    targetLevel: eng.targetLevel,
    startedAt: eng.scheduledStartDate,
    completedAt: null,
    description: eng.scope,
    package: {
      id: eng.id,
      name: eng.name,
      organization: { id: eng.id, name: eng.clientName },
      evidence: [],
      poams: [],
    },
    leadAssessor: {
      id: eng.leadAssessorId,
      name: eng.leadAssessorName,
    },
  }
}
