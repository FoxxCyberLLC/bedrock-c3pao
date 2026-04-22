/**
 * Definitions for the 8 fixed pre-assessment readiness items.
 * UI layers consume this to render titles, helper text, and placeholders.
 */

import type { ReadinessItemKey } from './readiness-types'
import { READINESS_ITEM_KEYS } from './readiness-types'

export interface ReadinessItemDefinition {
  key: ReadinessItemKey
  title: string
  defaultArtifactDescription: string
  typicalWaiverReason: string
  order: number
}

export const READINESS_ITEM_DEFINITIONS: Record<ReadinessItemKey, ReadinessItemDefinition> = {
  contract_executed: {
    key: 'contract_executed',
    title: 'Contract Executed',
    defaultArtifactDescription: 'Signed contract PDF',
    typicalWaiverReason: 'Verbal agreement, contract pending',
    order: 1,
  },
  ssp_reviewed: {
    key: 'ssp_reviewed',
    title: 'SSP Reviewed',
    defaultArtifactDescription: 'SSP review memo or markup',
    typicalWaiverReason: 'Reviewed live in working session',
    order: 2,
  },
  boe_confirmed: {
    key: 'boe_confirmed',
    title: 'Body of Evidence Confirmed',
    defaultArtifactDescription: 'BoE inventory checklist',
    typicalWaiverReason: 'Reviewed in-system, no external doc needed',
    order: 3,
  },
  coi_cleared: {
    key: 'coi_cleared',
    title: 'Conflicts of Interest Cleared',
    defaultArtifactDescription: 'Signed COI attestation per team member',
    typicalWaiverReason: 'Standing COI register already on file',
    order: 4,
  },
  team_composed: {
    key: 'team_composed',
    title: 'Assessment Team Composed',
    defaultArtifactDescription: 'Team roster PDF',
    typicalWaiverReason: 'Team info in-system is sufficient',
    order: 5,
  },
  form_drafted: {
    key: 'form_drafted',
    title: 'Pre-Assess Form Drafted',
    defaultArtifactDescription: 'Draft form document',
    typicalWaiverReason: 'Form in shared drive, not uploaded yet',
    order: 6,
  },
  form_qad: {
    key: 'form_qad',
    title: "Pre-Assess Form QA'd",
    defaultArtifactDescription: 'QA review notes or redlined form',
    typicalWaiverReason: 'QA done verbally with reviewer',
    order: 7,
  },
  emass_uploaded: {
    key: 'emass_uploaded',
    title: 'Uploaded to eMASS',
    defaultArtifactDescription: 'eMASS confirmation (screenshot or ref #)',
    typicalWaiverReason: 'Upload pending',
    order: 8,
  },
}

/** Return all item definitions in canonical (order 1..8) sequence. */
export function orderedItemDefinitions(): ReadinessItemDefinition[] {
  return READINESS_ITEM_KEYS.map((k) => READINESS_ITEM_DEFINITIONS[k])
}
