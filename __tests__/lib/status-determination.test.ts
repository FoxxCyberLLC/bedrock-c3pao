import { describe, it, expect } from 'vitest'
import {
  mapRequirementStatusToObjective,
  determineCMMCStatus,
} from '@/lib/cmmc/status-determination'

describe('mapRequirementStatusToObjective', () => {
  it('maps COMPLIANT -> MET', () => {
    expect(mapRequirementStatusToObjective('COMPLIANT')).toBe('MET')
  })
  it('maps NON_COMPLIANT -> NOT_MET', () => {
    expect(mapRequirementStatusToObjective('NON_COMPLIANT')).toBe('NOT_MET')
  })
  it('maps IN_POAM -> NOT_MET (not NOT_ASSESSED) so the determination treats it as not-met', () => {
    expect(mapRequirementStatusToObjective('IN_POAM')).toBe('NOT_MET')
  })
  it('maps NOT_APPLICABLE -> NOT_APPLICABLE', () => {
    expect(mapRequirementStatusToObjective('NOT_APPLICABLE')).toBe('NOT_APPLICABLE')
  })
  it('maps unknown -> NOT_ASSESSED', () => {
    expect(mapRequirementStatusToObjective('SOMETHING_ELSE')).toBe('NOT_ASSESSED')
  })
})

describe('determineCMMCStatus treats an IN_POAM requirement as NOT_MET (B-HIGH-1)', () => {
  it('suggests CONDITIONAL_LEVEL_2 for an IN_POAM requirement with a valid POA&M', () => {
    const objectives = [
      { requirementId: 'AC.L2-3.1.1', status: mapRequirementStatusToObjective('COMPLIANT') },
      // AU.L2-3.3.9 (03.03.09) is POA&M-eligible (poamAllowed: true).
      { requirementId: 'AU.L2-3.3.9', status: mapRequirementStatusToObjective('IN_POAM') },
    ]
    const poams = [
      {
        id: 'poam-1',
        scheduledCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]
    const result = determineCMMCStatus(objectives, poams)
    expect(result.suggestedStatus).toBe('CONDITIONAL_LEVEL_2')
  })
})
