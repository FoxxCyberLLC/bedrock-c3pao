/**
 * Adapter mapping an OutsideEngagement to the prop shape <EngagementDetail>
 * already expects. atoPackage is populated with the engagement name + client
 * organization so the header reads correctly; all OSC-only nested arrays
 * (requirementStatuses, poams, evidence, ssp, assets, externalServiceProviders)
 * are empty/null because the Package section is gated off entirely by
 * visible-tabs.ts when kind === 'outside_osc'.
 */

import type { OutsideEngagement } from '@/lib/outside-engagement-types'

/**
 * Structural shape consumable by <EngagementDetail>'s `engagement` prop.
 * Typed loosely on the inner package details to avoid leaking the consumer's
 * local Evidence / POAM / RequirementStatus / SSP / Asset / ESP types here.
 */
export interface CommonEngagementShape {
  id: string
  status: string
  targetLevel: string
  description: string | null
  atoPackage: {
    id: string
    name: string
    cmmcLevel: string
    description: string | null
    organization: { id: string; name: string } | null
    requirementStatuses: never[]
    poams: never[]
    evidence: never[]
    ssp: null
    assets: never[]
    externalServiceProviders: never[]
  } | null
  leadAssessor: { id: string; name: string; email: string } | null
}

export function outsideToCommon(eng: OutsideEngagement): CommonEngagementShape {
  return {
    id: eng.id,
    status: eng.status,
    targetLevel: eng.targetLevel,
    description: eng.scope,
    atoPackage: {
      id: eng.id,
      name: eng.name,
      cmmcLevel: eng.targetLevel,
      description: eng.scope,
      organization: { id: eng.id, name: eng.clientName },
      requirementStatuses: [],
      poams: [],
      evidence: [],
      ssp: null,
      assets: [],
      externalServiceProviders: [],
    },
    leadAssessor: {
      id: eng.leadAssessorId,
      name: eng.leadAssessorName,
      email: eng.clientPocEmail,
    },
  }
}
