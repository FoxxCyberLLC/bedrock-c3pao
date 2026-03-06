import { describe, it, expect } from 'vitest'
import { addDays, addYears } from 'date-fns'
import {
  determineCMMCStatus,
  calculateExpirationDate,
  CMMCStatusConfig,
  normalizeLegacyStatus,
  type CMMCStatus,
  type ObjectiveStatusEntry,
} from '../../../lib/cmmc/status-determination'

// Helper to build a POA&M-like object with scheduledCompletionDate
function makePOAM(daysFuture: number) {
  return {
    id: 'poam-1',
    scheduledCompletionDate: addDays(new Date(), daysFuture).toISOString(),
  }
}

describe('determineCMMCStatus', () => {
  describe('empty objectives guard', () => {
    it('should return NO_CMMC_STATUS with medium confidence when objectives array is empty', () => {
      const result = determineCMMCStatus([], [])
      expect(result.suggestedStatus).toBe('NO_CMMC_STATUS')
      expect(result.confidence).toBe('medium')
      expect(result.reasoning).toMatch(/no objectives/i)
    })
  })

  describe('zero-assessed guard', () => {
    it('should return NO_CMMC_STATUS with medium confidence when all objectives are NOT_ASSESSED', () => {
      const objectives: ObjectiveStatusEntry[] = [
        { requirementId: '03.01.01', status: 'NOT_ASSESSED' },
        { requirementId: '03.01.02', status: 'NOT_ASSESSED' },
      ]
      const result = determineCMMCStatus(objectives, [])
      expect(result.suggestedStatus).toBe('NO_CMMC_STATUS')
      expect(result.confidence).toBe('medium')
      expect(result.reasoning).toMatch(/no objectives have been assessed/i)
    })
  })

  describe('all MET', () => {
    it('should return FINAL_LEVEL_2 with high confidence when all objectives are MET', () => {
      const objectives: ObjectiveStatusEntry[] = [
        { requirementId: '03.01.01', status: 'MET' },
        { requirementId: '03.01.02', status: 'MET' },
        { requirementId: '03.01.03', status: 'MET' },
      ]
      const result = determineCMMCStatus(objectives, [])
      expect(result.suggestedStatus).toBe('FINAL_LEVEL_2')
      expect(result.confidence).toBe('high')
    })

    it('should return FINAL_LEVEL_2 when all assessed objectives are MET (some NOT_APPLICABLE)', () => {
      const objectives: ObjectiveStatusEntry[] = [
        { requirementId: '03.01.01', status: 'MET' },
        { requirementId: '03.01.03', status: 'NOT_APPLICABLE' },
      ]
      const result = determineCMMCStatus(objectives, [])
      expect(result.suggestedStatus).toBe('FINAL_LEVEL_2')
      expect(result.confidence).toBe('high')
    })
  })

  describe('poamAllowed: false guard', () => {
    it('should return NO_CMMC_STATUS with high confidence when a NOT_MET requirement has poamAllowed: false', () => {
      const objectives: ObjectiveStatusEntry[] = [
        { requirementId: '03.01.01', status: 'NOT_MET' }, // poamAllowed: false
        { requirementId: '03.01.03', status: 'MET' },
      ]
      // Provide valid POA&Ms — should still return NO_CMMC_STATUS due to ineligible requirement
      const poams = [makePOAM(30)]
      const result = determineCMMCStatus(objectives, poams)
      expect(result.suggestedStatus).toBe('NO_CMMC_STATUS')
      expect(result.confidence).toBe('high')
      expect(result.reasoning).toMatch(/03\.01\.01/i)
    })
  })

  describe('Conditional Level 2 — valid POA&M scheduling', () => {
    it('should return CONDITIONAL_LEVEL_2 with high confidence when NOT_MET (eligible) + POA&M with date within 180 days', () => {
      const objectives: ObjectiveStatusEntry[] = [
        { requirementId: '03.01.03', status: 'NOT_MET' }, // poamAllowed: true
        { requirementId: '03.01.01', status: 'MET' },
      ]
      const poams = [makePOAM(60)] // 60 days — within 180
      const result = determineCMMCStatus(objectives, poams)
      expect(result.suggestedStatus).toBe('CONDITIONAL_LEVEL_2')
      expect(result.confidence).toBe('high')
    })

    it('should return CONDITIONAL_LEVEL_2 with medium confidence when POA&M date exceeds 180 days', () => {
      const objectives: ObjectiveStatusEntry[] = [
        { requirementId: '03.01.03', status: 'NOT_MET' },
      ]
      const poams = [makePOAM(200)] // 200 days — exceeds 180
      const result = determineCMMCStatus(objectives, poams)
      expect(result.suggestedStatus).toBe('CONDITIONAL_LEVEL_2')
      expect(result.confidence).toBe('medium')
      expect(result.reasoning).toMatch(/scheduling/i)
    })

    it('should return CONDITIONAL_LEVEL_2 with medium confidence when POA&M lacks scheduledCompletionDate', () => {
      const objectives: ObjectiveStatusEntry[] = [
        { requirementId: '03.01.03', status: 'NOT_MET' },
      ]
      const poams = [{ id: 'poam-1', scheduledCompletionDate: '' }]
      const result = determineCMMCStatus(objectives, poams)
      expect(result.suggestedStatus).toBe('CONDITIONAL_LEVEL_2')
      expect(result.confidence).toBe('medium')
    })
  })

  describe('No CMMC Status — no valid POA&M', () => {
    it('should return NO_CMMC_STATUS with high confidence when NOT_MET objectives and no POA&Ms', () => {
      const objectives: ObjectiveStatusEntry[] = [
        { requirementId: '03.01.03', status: 'NOT_MET' },
        { requirementId: '03.01.01', status: 'MET' },
      ]
      const result = determineCMMCStatus(objectives, [])
      expect(result.suggestedStatus).toBe('NO_CMMC_STATUS')
      expect(result.confidence).toBe('high')
    })
  })
})

describe('calculateExpirationDate', () => {
  it('should return date 3 years from base date for FINAL_LEVEL_2', () => {
    const base = new Date('2026-01-01')
    const result = calculateExpirationDate('FINAL_LEVEL_2', base)
    expect(result).toEqual(addYears(base, 3))
  })

  it('should return date 180 days from base date for CONDITIONAL_LEVEL_2', () => {
    const base = new Date('2026-01-01')
    const result = calculateExpirationDate('CONDITIONAL_LEVEL_2', base)
    expect(result).toEqual(addDays(base, 180))
  })

  it('should return null for NO_CMMC_STATUS', () => {
    const base = new Date('2026-01-01')
    const result = calculateExpirationDate('NO_CMMC_STATUS', base)
    expect(result).toBeNull()
  })
})

describe('CMMCStatusConfig', () => {
  it('should have entries for all three statuses', () => {
    expect(CMMCStatusConfig['FINAL_LEVEL_2']).toBeDefined()
    expect(CMMCStatusConfig['CONDITIONAL_LEVEL_2']).toBeDefined()
    expect(CMMCStatusConfig['NO_CMMC_STATUS']).toBeDefined()
  })

  it('should have label, description, and colorClass for each status', () => {
    const statuses: CMMCStatus[] = ['FINAL_LEVEL_2', 'CONDITIONAL_LEVEL_2', 'NO_CMMC_STATUS']
    for (const s of statuses) {
      expect(CMMCStatusConfig[s].label).toBeTruthy()
      expect(CMMCStatusConfig[s].description).toBeTruthy()
      expect(CMMCStatusConfig[s].colorClass).toBeTruthy()
    }
  })
})

describe('normalizeLegacyStatus', () => {
  it('should pass through new CMMC statuses unchanged', () => {
    expect(normalizeLegacyStatus('FINAL_LEVEL_2')).toBe('FINAL_LEVEL_2')
    expect(normalizeLegacyStatus('CONDITIONAL_LEVEL_2')).toBe('CONDITIONAL_LEVEL_2')
    expect(normalizeLegacyStatus('NO_CMMC_STATUS')).toBe('NO_CMMC_STATUS')
  })

  it('should map legacy PASSED to FINAL_LEVEL_2', () => {
    expect(normalizeLegacyStatus('PASSED')).toBe('FINAL_LEVEL_2')
  })

  it('should map legacy FAILED to NO_CMMC_STATUS', () => {
    expect(normalizeLegacyStatus('FAILED')).toBe('NO_CMMC_STATUS')
  })

  it('should map legacy CONDITIONAL to CONDITIONAL_LEVEL_2', () => {
    expect(normalizeLegacyStatus('CONDITIONAL')).toBe('CONDITIONAL_LEVEL_2')
  })

  it('should return null for null or undefined input', () => {
    expect(normalizeLegacyStatus(null)).toBeNull()
    expect(normalizeLegacyStatus(undefined)).toBeNull()
  })

  it('should return null for unknown strings', () => {
    expect(normalizeLegacyStatus('UNKNOWN')).toBeNull()
    expect(normalizeLegacyStatus('')).toBeNull()
  })
})
