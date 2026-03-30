import { describe, it, expect } from 'vitest'
import { parseCKLBFile, validateCKLBFile } from '../../../lib/stig/parser'

const VALID_CKLB = JSON.stringify({
  title: 'Test CKLB',
  id: 'test-id',
  target_data: { host_name: 'test-host' },
  stigs: [
    {
      display_name: 'Test STIG',
      rules: [
        {
          rule_title: 'Rule 1',
          status: 'open',
          severity: 'high',
          group_id: 'V-100001',
          rule_id_src: 'SV-100001r1_rule',
        },
      ],
    },
  ],
})

describe('parseCKLBFile', () => {
  it('parses valid CKLB JSON', () => {
    const result = parseCKLBFile(VALID_CKLB)
    expect(result.target_data.host_name).toBe('test-host')
    expect(result.stigs).toHaveLength(1)
  })

  it('throws on malformed JSON (H12: DoS guard)', () => {
    expect(() => parseCKLBFile('not valid json')).toThrow()
  })

  it('throws RangeError when input exceeds size limit (H12: DoS guard)', () => {
    const huge = 'x'.repeat(11 * 1024 * 1024) // 11 MB (exceeds 10 MB limit)
    expect(() => parseCKLBFile(huge)).toThrow(/size limit/i)
  })

  it('accepts input at the boundary (≤10 MB)', () => {
    // This should not throw a size error — it will fail Zod validation which is fine
    const borderline = VALID_CKLB + ' '.repeat(1024) // well under 10 MB
    const result = parseCKLBFile(borderline)
    expect(result.target_data.host_name).toBe('test-host')
  })
})

describe('validateCKLBFile', () => {
  it('returns valid: true for well-formed CKLB', () => {
    const result = validateCKLBFile(VALID_CKLB)
    expect(result.valid).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('returns valid: false for malformed JSON', () => {
    const result = validateCKLBFile('not json')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid JSON format')
  })

  it('returns valid: false when input exceeds size limit (H12)', () => {
    const huge = 'x'.repeat(11 * 1024 * 1024)
    const result = validateCKLBFile(huge)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/size limit/i)
  })
})
