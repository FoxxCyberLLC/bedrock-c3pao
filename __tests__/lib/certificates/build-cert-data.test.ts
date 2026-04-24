import { describe, expect, it, vi, afterEach } from 'vitest'
import { buildCertificateData } from '@/lib/certificates/build-cert-data'

const baseArgs = {
  engagementId: '12345678-aaaa-bbbb-cccc-1234567890ab',
  organizationName: 'Acme Corp',
  packageName: 'CUI Enclave',
  targetLevel: 'LEVEL_2',
  leadAssessorName: 'Jane Lead',
  c3paoName: 'Test C3PAO',
}

describe('buildCertificateData', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null when assessmentResult is null', () => {
    expect(
      buildCertificateData({
        ...baseArgs,
        assessmentResult: null,
        actualCompletionDate: '2026-01-15T00:00:00Z',
      }),
    ).toBeNull()
  })

  it('returns null when assessmentResult is FAILED', () => {
    expect(
      buildCertificateData({
        ...baseArgs,
        assessmentResult: 'FAILED',
        actualCompletionDate: '2026-01-15T00:00:00Z',
      }),
    ).toBeNull()
  })

  it('returns null when targetLevel is not Level 2', () => {
    expect(
      buildCertificateData({
        ...baseArgs,
        targetLevel: 'LEVEL_1',
        assessmentResult: 'PASSED',
        actualCompletionDate: '2026-01-15T00:00:00Z',
      }),
    ).toBeNull()
  })

  it('maps PASSED to FINAL_LEVEL_2 with 3-year expiry', () => {
    const data = buildCertificateData({
      ...baseArgs,
      assessmentResult: 'PASSED',
      actualCompletionDate: '2026-01-15T00:00:00Z',
    })
    expect(data).not.toBeNull()
    expect(data!.determination).toBe('FINAL_LEVEL_2')
    expect(data!.issuedDate.toISOString()).toBe('2026-01-15T00:00:00.000Z')
    // 3 years (1095 days) added
    const expected = new Date('2026-01-15T00:00:00.000Z')
    expected.setUTCDate(expected.getUTCDate() + 365 * 3)
    expect(data!.expiryDate.toISOString()).toBe(expected.toISOString())
    expect(data!.poamCloseoutDate).toBeNull()
  })

  it('maps CONDITIONAL to CONDITIONAL_LEVEL_2 with 180-day expiry', () => {
    const data = buildCertificateData({
      ...baseArgs,
      assessmentResult: 'CONDITIONAL',
      actualCompletionDate: '2026-01-15T00:00:00Z',
      poamCloseoutDate: '2026-07-14T00:00:00Z',
    })
    expect(data).not.toBeNull()
    expect(data!.determination).toBe('CONDITIONAL_LEVEL_2')
    const expected = new Date('2026-01-15T00:00:00.000Z')
    expected.setUTCDate(expected.getUTCDate() + 180)
    expect(data!.expiryDate.toISOString()).toBe(expected.toISOString())
    expect(data!.poamCloseoutDate?.toISOString()).toBe(
      '2026-07-14T00:00:00.000Z',
    )
  })

  it('falls back to today when actualCompletionDate is missing', () => {
    const fixedNow = new Date('2026-04-23T12:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(fixedNow)

    const data = buildCertificateData({
      ...baseArgs,
      assessmentResult: 'PASSED',
      actualCompletionDate: null,
    })
    expect(data).not.toBeNull()
    expect(data!.issuedDate.getUTCFullYear()).toBe(2026)
    expect(data!.issuedDate.getUTCMonth()).toBe(3) // April (0-indexed)
    expect(data!.issuedDate.getUTCDate()).toBe(23)
  })

  it('generates a DRAFT-prefixed UID with date suffix', () => {
    const data = buildCertificateData({
      ...baseArgs,
      assessmentResult: 'PASSED',
      actualCompletionDate: '2026-01-15T00:00:00Z',
    })
    expect(data).not.toBeNull()
    // 12345678-aaaa-... => first 8 chars stripped of dashes => 12345678
    expect(data!.certUid).toBe('DRAFT-12345678-20260115')
    expect(data!.isDraft).toBe(true)
  })

  it('accepts modern enum values too (FINAL_LEVEL_2 / CONDITIONAL_LEVEL_2)', () => {
    const final = buildCertificateData({
      ...baseArgs,
      assessmentResult: 'FINAL_LEVEL_2',
      actualCompletionDate: '2026-01-15T00:00:00Z',
    })
    expect(final?.determination).toBe('FINAL_LEVEL_2')

    const cond = buildCertificateData({
      ...baseArgs,
      assessmentResult: 'CONDITIONAL_LEVEL_2',
      actualCompletionDate: '2026-01-15T00:00:00Z',
    })
    expect(cond?.determination).toBe('CONDITIONAL_LEVEL_2')
  })
})
