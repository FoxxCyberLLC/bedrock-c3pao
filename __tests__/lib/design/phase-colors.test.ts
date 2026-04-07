import { describe, expect, it } from 'vitest'
import {
  phaseColors,
  riskColors,
  qaColors,
  certColors,
  getPhaseColor,
  getRiskColor,
  getQAColor,
  getCertColor,
  type Phase,
  type Risk,
  type QAStatus,
  type CertStatus,
} from '@/lib/design/phase-colors'

describe('phase-colors design tokens', () => {
  describe('phaseColors', () => {
    const allPhases: Phase[] = ['PRE_ASSESS', 'ASSESS', 'REPORT', 'CLOSE_OUT']

    it('defines entries for every CAP v2.0 phase', () => {
      for (const phase of allPhases) {
        expect(phaseColors[phase]).toBeDefined()
      }
    })

    it('returns non-empty class strings for bg/fg/border/chip on every phase', () => {
      for (const phase of allPhases) {
        const entry = phaseColors[phase]
        expect(entry.bg).toBeTypeOf('string')
        expect(entry.bg.length).toBeGreaterThan(0)
        expect(entry.fg).toBeTypeOf('string')
        expect(entry.fg.length).toBeGreaterThan(0)
        expect(entry.border).toBeTypeOf('string')
        expect(entry.border.length).toBeGreaterThan(0)
        expect(entry.chip).toBeTypeOf('string')
        expect(entry.chip.length).toBeGreaterThan(0)
        expect(entry.label).toBeTypeOf('string')
        expect(entry.label.length).toBeGreaterThan(0)
      }
    })

    it('assigns distinct hue labels so each phase is visually differentiated', () => {
      const labels = allPhases.map((p) => phaseColors[p].label)
      const unique = new Set(labels)
      expect(unique.size).toBe(labels.length)
    })

    it('getPhaseColor(phase) returns the same entry as the record lookup', () => {
      for (const phase of allPhases) {
        expect(getPhaseColor(phase)).toBe(phaseColors[phase])
      }
    })

    it('getPhaseColor(null) returns a neutral fallback entry', () => {
      const fallback = getPhaseColor(null)
      expect(fallback).toBeDefined()
      expect(fallback.bg.length).toBeGreaterThan(0)
      expect(fallback.label).toBe('Unknown')
    })

    it('getPhaseColor(unknown string) returns the neutral fallback', () => {
      // Simulates an unexpected value from the API (defense in depth)
      const fallback = getPhaseColor('BOGUS' as unknown as Phase)
      expect(fallback.label).toBe('Unknown')
    })
  })

  describe('riskColors', () => {
    const allRisks: Risk[] = ['ON_TRACK', 'AT_RISK', 'OVERDUE']

    it('defines entries for every risk level', () => {
      for (const risk of allRisks) {
        expect(riskColors[risk]).toBeDefined()
      }
    })

    it('returns non-empty class strings on every risk level', () => {
      for (const risk of allRisks) {
        const entry = riskColors[risk]
        expect(entry.bg.length).toBeGreaterThan(0)
        expect(entry.fg.length).toBeGreaterThan(0)
        expect(entry.border.length).toBeGreaterThan(0)
        expect(entry.chip.length).toBeGreaterThan(0)
        expect(entry.label.length).toBeGreaterThan(0)
      }
    })

    it('getRiskColor(risk) matches the record lookup', () => {
      for (const risk of allRisks) {
        expect(getRiskColor(risk)).toBe(riskColors[risk])
      }
    })
  })

  describe('qaColors', () => {
    const allStatuses: QAStatus[] = [
      'PENDING',
      'IN_REVIEW',
      'APPROVED',
      'NEEDS_REVISION',
      'REJECTED',
    ]

    it('defines entries for every QA review status', () => {
      for (const status of allStatuses) {
        expect(qaColors[status]).toBeDefined()
      }
    })

    it('returns non-empty class strings on every QA status', () => {
      for (const status of allStatuses) {
        const entry = qaColors[status]
        expect(entry.bg.length).toBeGreaterThan(0)
        expect(entry.fg.length).toBeGreaterThan(0)
        expect(entry.chip.length).toBeGreaterThan(0)
        expect(entry.label.length).toBeGreaterThan(0)
      }
    })

    it('getQAColor(status) matches the record lookup', () => {
      for (const status of allStatuses) {
        expect(getQAColor(status)).toBe(qaColors[status])
      }
    })
  })

  describe('certColors', () => {
    const allStatuses: CertStatus[] = [
      'FINAL_LEVEL_2',
      'CONDITIONAL_LEVEL_2',
      'NO_CMMC_STATUS',
      'EXPIRING_SOON',
      'EXPIRED',
    ]

    it('defines entries for every certificate status', () => {
      for (const status of allStatuses) {
        expect(certColors[status]).toBeDefined()
      }
    })

    it('returns non-empty class strings on every cert status', () => {
      for (const status of allStatuses) {
        const entry = certColors[status]
        expect(entry.bg.length).toBeGreaterThan(0)
        expect(entry.fg.length).toBeGreaterThan(0)
        expect(entry.chip.length).toBeGreaterThan(0)
        expect(entry.label.length).toBeGreaterThan(0)
      }
    })

    it('getCertColor(status) matches the record lookup', () => {
      for (const status of allStatuses) {
        expect(getCertColor(status)).toBe(certColors[status])
      }
    })

    it('getCertColor(null) returns a neutral fallback', () => {
      const fallback = getCertColor(null)
      expect(fallback).toBeDefined()
      expect(fallback.label.length).toBeGreaterThan(0)
    })
  })

  describe('consistency', () => {
    it('every color entry uses Tailwind utility class prefixes (bg-, text-, border-)', () => {
      const allEntries = [
        ...Object.values(phaseColors),
        ...Object.values(riskColors),
        ...Object.values(qaColors),
        ...Object.values(certColors),
      ]

      for (const entry of allEntries) {
        // bg must start with bg- (or contain it)
        expect(entry.bg).toMatch(/\bbg-/)
        // fg must start with text-
        expect(entry.fg).toMatch(/\btext-/)
        // chip is a composite; at minimum must contain bg- and text-
        expect(entry.chip).toMatch(/\bbg-/)
        expect(entry.chip).toMatch(/\btext-/)
      }
    })
  })
})
