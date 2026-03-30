/**
 * CMMC Assessment Status Determination
 *
 * Implements the Phase 3 outcome logic from CAP v2.0:
 * - Final Level 2: All requirements MET → 3-year certificate
 * - Conditional Level 2: Some NOT_MET with valid POA&M per 32 CFR §170.21(a)(2) → 180-day certificate
 * - No CMMC Status: NOT_MET with no valid POA&M, or POA&M-ineligible requirements NOT_MET
 *
 * The lead CCA makes the final determination. This utility auto-suggests but the
 * assessor always retains override capability.
 */

import { addDays, addYears, isAfter, parseISO } from 'date-fns'
import { getRequirementValue } from './requirement-values'

/** The three possible CMMC Level 2 assessment outcomes */
export type CMMCStatus = 'FINAL_LEVEL_2' | 'CONDITIONAL_LEVEL_2' | 'NO_CMMC_STATUS'

/** Objective-level status from the assessment */
export type ObjectiveStatus = 'MET' | 'NOT_MET' | 'NOT_ASSESSED' | 'NOT_APPLICABLE'

/** Input entry mapping a requirement ID to its assessed objective status */
export interface ObjectiveStatusEntry {
  requirementId: string
  status: ObjectiveStatus
}

/** Minimal POA&M shape needed for status determination */
export interface POAMInput {
  id: string
  scheduledCompletionDate: string
}

/** Result from status determination */
export interface StatusDetermination {
  suggestedStatus: CMMCStatus
  reasoning: string
  confidence: 'high' | 'medium'
}

/** Display configuration for each CMMC status */
export interface CMMCStatusDisplayConfig {
  label: string
  description: string
  colorClass: string
  bgClass: string
  borderClass: string
  textClass: string
  expirationYears: number | null
  expirationDays: number | null
}

/** Configuration map for all three CMMC statuses */
export const CMMCStatusConfig: Record<CMMCStatus, CMMCStatusDisplayConfig> = {
  FINAL_LEVEL_2: {
    label: 'Final Level 2',
    description: 'All requirements met. Recommended for CMMC Level 2 certification.',
    colorClass: 'green',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    textClass: 'text-green-800',
    expirationYears: 3,
    expirationDays: null,
  },
  CONDITIONAL_LEVEL_2: {
    label: 'Conditional Level 2',
    description:
      'Conditional certification granted. POA&M must be closed out within 180 days. Closeout may be performed by any C3PAO.',
    colorClass: 'amber',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    textClass: 'text-amber-800',
    expirationYears: null,
    expirationDays: 180,
  },
  NO_CMMC_STATUS: {
    label: 'No CMMC Status',
    description: 'Assessment requirements not met. A new assessment may be initiated.',
    colorClass: 'red',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    textClass: 'text-red-800',
    expirationYears: null,
    expirationDays: null,
  },
}

/**
 * Determine the CMMC Level 2 assessment status from objective results and POA&M data.
 *
 * Logic (ordered by priority per CAP v2.0 Phase 3 and 32 CFR §170.21(a)(2)):
 * 1. Zero-assessed guard: all NOT_ASSESSED → NO_CMMC_STATUS (medium confidence)
 * 2. All MET (or NOT_APPLICABLE) → FINAL_LEVEL_2 (high confidence)
 * 3. Any NOT_MET with poamAllowed: false → NO_CMMC_STATUS (high confidence, regulatory block)
 * 4. NOT_MET (eligible) + POA&Ms with valid scheduling → CONDITIONAL_LEVEL_2
 *    - High confidence: date set and within 180 days
 *    - Medium confidence: date missing or exceeds 180 days
 * 5. No valid POA&Ms → NO_CMMC_STATUS (high confidence)
 */
export function determineCMMCStatus(
  objectives: ObjectiveStatusEntry[],
  poams: POAMInput[]
): StatusDetermination {
  if (objectives.length === 0) {
    return {
      suggestedStatus: 'NO_CMMC_STATUS',
      reasoning: 'No objectives have been assessed. Complete all objective assessments before finalizing.',
      confidence: 'medium',
    }
  }

  // Filter to assessable objectives (exclude NOT_APPLICABLE)
  const assessable = objectives.filter((o) => o.status !== 'NOT_APPLICABLE')

  // 1. Zero-assessed guard
  const allNotAssessed = assessable.every((o) => o.status === 'NOT_ASSESSED')
  if (allNotAssessed) {
    return {
      suggestedStatus: 'NO_CMMC_STATUS',
      reasoning:
        'No objectives have been assessed. Complete all objective assessments before finalizing.',
      confidence: 'medium',
    }
  }

  // 2. All MET (or NOT_APPLICABLE filtered out above)
  const hasNotMet = assessable.some((o) => o.status === 'NOT_MET')
  if (!hasNotMet) {
    // Partial assessment: if some objectives were NOT_ASSESSED, confidence is medium
    const hasNotAssessed = assessable.some((o) => o.status === 'NOT_ASSESSED')
    return {
      suggestedStatus: 'FINAL_LEVEL_2',
      reasoning: hasNotAssessed
        ? 'All assessed objectives are MET, but some have not been assessed yet. Confidence is reduced until assessment is complete.'
        : 'All assessed objectives are MET. Recommended for Final Level 2 certification.',
      confidence: hasNotAssessed ? 'medium' : 'high',
    }
  }

  // 3. Check for POA&M-ineligible NOT_MET requirements (H9: normalize CMMC-format IDs via getRequirementValue)
  const notMetEntries = assessable.filter((o) => o.status === 'NOT_MET')
  const ineligibleNotMet = notMetEntries.filter((o) => {
    const reqValue = getRequirementValue(o.requirementId)
    return reqValue.poamAllowed === false
  })

  if (ineligibleNotMet.length > 0) {
    const ids = ineligibleNotMet.map((o) => o.requirementId).join(', ')
    return {
      suggestedStatus: 'NO_CMMC_STATUS',
      reasoning: `One or more NOT_MET requirements are ineligible for POA&M per 32 CFR §170.21(a)(2): ${ids}. Conditional Level 2 is not available when these requirements are not met.`,
      confidence: 'high',
    }
  }

  // 4. Check POA&M validity (shallow §170.21(a)(2) check)
  if (poams.length > 0) {
    const now = new Date()
    const deadline180 = addDays(now, 180)

    const allHaveDates = poams.every((p) => p.scheduledCompletionDate)
    const allWithinWindow = poams.every((p) => {
      if (!p.scheduledCompletionDate) return false
      const date = parseISO(p.scheduledCompletionDate)
      return !isAfter(date, deadline180)
    })

    if (allHaveDates && allWithinWindow) {
      return {
        suggestedStatus: 'CONDITIONAL_LEVEL_2',
        reasoning:
          'Some requirements are NOT MET but valid POA&Ms exist with scheduling within the 180-day window. Conditional Level 2 certification may be recommended.',
        confidence: 'high',
      }
    } else {
      return {
        suggestedStatus: 'CONDITIONAL_LEVEL_2',
        reasoning:
          'POA&Ms exist but may not meet §170.21(a)(2) scheduling requirements — verify with lead assessor. Some POA&Ms are missing scheduled completion dates or exceed the 180-day remediation window.',
        confidence: 'medium',
      }
    }
  }

  // 5. No valid POA&Ms
  return {
    suggestedStatus: 'NO_CMMC_STATUS',
    reasoning: 'One or more requirements are NOT MET and no POA&Ms exist. No CMMC Status will be assigned.',
    confidence: 'high',
  }
}

/**
 * Calculate the certificate expiration date based on CMMC status.
 * Frontend-computed — the backend does not store expiration dates.
 *
 * - Final Level 2: 3 years from completion date
 * - Conditional Level 2: 180 days from completion date
 * - No CMMC Status: no certificate, returns null
 */
export function calculateExpirationDate(status: CMMCStatus, completionDate: Date): Date | null {
  switch (status) {
    case 'FINAL_LEVEL_2':
      return addYears(completionDate, 3)
    case 'CONDITIONAL_LEVEL_2':
      return addDays(completionDate, 180)
    case 'NO_CMMC_STATUS':
      return null
  }
}

/**
 * Normalize legacy assessmentResult values to CMMCStatus for display purposes.
 * Used by UI components that may encounter old PASSED/FAILED/CONDITIONAL data.
 */
export function normalizeLegacyStatus(
  assessmentResult: string | null | undefined
): CMMCStatus | null {
  if (!assessmentResult) return null
  switch (assessmentResult) {
    case 'FINAL_LEVEL_2':
    case 'CONDITIONAL_LEVEL_2':
    case 'NO_CMMC_STATUS':
      return assessmentResult
    case 'PASSED':
      return 'FINAL_LEVEL_2'
    case 'FAILED':
      return 'NO_CMMC_STATUS'
    case 'CONDITIONAL':
      return 'CONDITIONAL_LEVEL_2'
    default:
      return null
  }
}
