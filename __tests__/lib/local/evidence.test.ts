import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Readable } from 'node:stream'

const mockQuery = vi.fn()
const getStream = vi.fn()

vi.mock('@/lib/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))
vi.mock('@/lib/storage/factory', () => ({ createStorage: () => ({ getStream }) }))

describe('lib/local/evidence', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists imported evidence with aggregated requirement ids', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'ev-1',
        edata: { filename: 'policy.txt', mimeType: 'text/plain', fileSize: 42, uploadedAt: '2026-06-01', description: 'AC policy' },
        requirement_ids: ['03.01.01', '03.01.02'],
      }],
    })
    const { getLocalEvidence } = await import('@/lib/local/evidence')

    const evidence = await getLocalEvidence('eng-1')

    expect(evidence[0]).toMatchObject({
      id: 'ev-1',
      fileName: 'policy.txt',
      mimeType: 'text/plain',
      fileSize: 42,
      description: 'AC policy',
      fileUrl: null,
      requirementIds: ['03.01.01', '03.01.02'],
    })
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toContain('imp_evidence')
    expect(sql).toContain('imp_evidence_objective_link')
  })

  it('streams evidence bytes from Storage at evidence/<id>/<fileName>', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ data: { filename: 'policy.txt', mimeType: 'text/plain' } }] })
    getStream.mockResolvedValueOnce({ stream: Readable.from(['hi']), sizeBytes: 2 })
    const { getLocalEvidenceObject } = await import('@/lib/local/evidence')

    const obj = await getLocalEvidenceObject('eng-1', 'ev-1')

    expect(getStream).toHaveBeenCalledWith('evidence/ev-1/policy.txt')
    expect(obj).toMatchObject({ sizeBytes: 2, mimeType: 'text/plain', fileName: 'policy.txt' })
  })

  it('returns null when the evidence row is not imported', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { getLocalEvidenceObject } = await import('@/lib/local/evidence')

    expect(await getLocalEvidenceObject('eng-1', 'missing')).toBeNull()
    expect(getStream).not.toHaveBeenCalled()
  })
})
