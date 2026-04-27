import { describe, it, expect } from 'vitest'
import { CMMC_FAMILIES, CMMC_FAMILY_CODES } from '@/lib/cmmc/families'

describe('CMMC_FAMILIES', () => {
  it('contains exactly 14 families', () => {
    expect(CMMC_FAMILIES).toHaveLength(14)
  })

  it('every code is exactly 2 uppercase letters', () => {
    for (const family of CMMC_FAMILIES) {
      expect(family.code).toMatch(/^[A-Z]{2}$/)
    }
  })

  it('every name is a non-empty string', () => {
    for (const family of CMMC_FAMILIES) {
      expect(typeof family.name).toBe('string')
      expect(family.name.length).toBeGreaterThan(0)
    }
  })

  it('all codes are unique', () => {
    const codes = CMMC_FAMILIES.map((f) => f.code)
    const unique = new Set(codes)
    expect(unique.size).toBe(codes.length)
  })
})

describe('CMMC_FAMILY_CODES', () => {
  it('matches the codes from CMMC_FAMILIES in the same order', () => {
    expect(CMMC_FAMILY_CODES).toEqual(CMMC_FAMILIES.map((f) => f.code))
  })

  it('has 14 entries', () => {
    expect(CMMC_FAMILY_CODES).toHaveLength(14)
  })
})
