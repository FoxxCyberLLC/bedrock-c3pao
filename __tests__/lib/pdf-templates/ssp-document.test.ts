import { describe, it, expect } from 'vitest'
import { parsePoamSummary, parseControlStatements } from '../../../lib/pdf-templates/ssp-document'

describe('parsePoamSummary (H13: safe JSON parse)', () => {
  it('returns null for null input', () => {
    expect(parsePoamSummary(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parsePoamSummary('')).toBeNull()
  })

  it('returns null for malformed JSON instead of crashing', () => {
    expect(parsePoamSummary('not valid json')).toBeNull()
  })

  it('returns null for truncated JSON', () => {
    expect(parsePoamSummary('{"totalPOAMs": 3')).toBeNull()
  })

  it('parses valid POA&M summary JSON', () => {
    const input = JSON.stringify({ totalPOAMs: 3, openPOAMs: 2, overdue: 1, items: [] })
    const result = parsePoamSummary(input)
    expect(result).not.toBeNull()
    expect(result!.totalPOAMs).toBe(3)
  })
})

describe('parseControlStatements (H13: safe JSON parse)', () => {
  it('returns empty object for null input', () => {
    expect(parseControlStatements(null)).toEqual({})
  })

  it('returns empty object for empty string', () => {
    expect(parseControlStatements('')).toEqual({})
  })

  it('returns empty object for malformed JSON instead of crashing', () => {
    expect(parseControlStatements('{invalid json')).toEqual({})
  })

  it('parses valid control statements JSON', () => {
    const input = JSON.stringify({ '3.1.1': { controlId: '3.1.1', status: 'COMPLIANT' } })
    const result = parseControlStatements(input)
    expect(result['3.1.1']).toBeDefined()
  })
})
