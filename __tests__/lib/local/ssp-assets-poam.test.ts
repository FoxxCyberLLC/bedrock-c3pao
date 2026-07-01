import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
vi.mock('@/lib/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

describe('lib/local/ssp-assets-poam', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the single imported SSP passthrough, scoped by engagement', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ data: { id: 'ssp-1', atoPackageId: 'pkg-1', systemName: 'Enclave', operatingModelAirGapped: true } }] })
    const { getLocalSSP } = await import('@/lib/local/ssp-assets-poam')

    const ssp = await getLocalSSP('eng-1')

    expect(ssp).toMatchObject({ id: 'ssp-1', systemName: 'Enclave', operatingModelAirGapped: true })
    expect(mockQuery.mock.calls[0][0]).toContain('imp_ssp')
    expect(mockQuery.mock.calls[0][1]).toEqual(['eng-1'])
  })

  it('returns null when no SSP was imported', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { getLocalSSP } = await import('@/lib/local/ssp-assets-poam')
    expect(await getLocalSSP('eng-1')).toBeNull()
  })

  it('lists imported assets from imp_asset', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ data: { id: 'a1', name: 'DC01', assetType: 'SERVER', processesCUI: true } }] })
    const { getLocalAssets } = await import('@/lib/local/ssp-assets-poam')

    const assets = await getLocalAssets('eng-1')

    expect(assets[0]).toMatchObject({ id: 'a1', name: 'DC01', processesCUI: true })
    expect(mockQuery.mock.calls[0][0]).toContain('imp_asset')
  })

  it('lists imported POA&Ms and maps their milestones', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        data: {
          id: 'p1', title: 'Patch servers', riskLevel: 'MEDIUM', status: 'OPEN',
          milestones: [{ description: 'Apply patches', dueDate: '2026-07-01', completed: false }],
        },
      }],
    })
    const { getLocalPoams } = await import('@/lib/local/ssp-assets-poam')

    const poams = await getLocalPoams('eng-1')

    expect(poams[0]).toMatchObject({ id: 'p1', title: 'Patch servers', riskLevel: 'MEDIUM' })
    expect(poams[0].milestones[0]).toEqual({ description: 'Apply patches', dueDate: '2026-07-01', completed: false, completedDate: null })
    expect(mockQuery.mock.calls[0][0]).toContain('imp_poam')
  })

  it('defaults milestones to an empty array when absent', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ data: { id: 'p2', title: 'No milestones' } }] })
    const { getLocalPoams } = await import('@/lib/local/ssp-assets-poam')

    const poams = await getLocalPoams('eng-1')

    expect(poams[0].milestones).toEqual([])
  })
})
