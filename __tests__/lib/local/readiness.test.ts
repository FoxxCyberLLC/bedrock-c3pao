import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
vi.mock('@/lib/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

describe('lib/local/readiness', () => {
  beforeEach(() => vi.clearAllMocks())

  it('READINESS_SCHEMA_DDL creates the local_customer_readiness table', async () => {
    const { READINESS_SCHEMA_DDL } = await import('@/lib/local/readiness')
    expect(READINESS_SCHEMA_DDL).toContain('CREATE TABLE IF NOT EXISTS local_customer_readiness')
    expect(READINESS_SCHEMA_DDL).toContain('PRIMARY KEY (engagement_id, item_type)')
  })

  it('lists readiness items, mapping columns to the view shape', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ item_type: 'SSP_UPLOADED', status: 'CONFIRMED', customer_note: null, evidence_url: null, c3pao_confirmed_at: '2026-06-01T00:00:00Z', last_updated_at: '2026-06-01T00:00:00Z', last_updated_by_type: 'C3PAO' }],
    })
    const { getLocalCustomerReadiness } = await import('@/lib/local/readiness')

    const items = await getLocalCustomerReadiness('eng-1')

    expect(items[0]).toMatchObject({ itemType: 'SSP_UPLOADED', status: 'CONFIRMED', lastUpdatedByType: 'C3PAO' })
    expect(mockQuery.mock.calls[0][0]).toContain('local_customer_readiness')
  })

  it('confirms an item via idempotent upsert', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { confirmLocalCustomerReadinessItem } = await import('@/lib/local/readiness')

    const item = await confirmLocalCustomerReadinessItem('eng-1', 'SSP_UPLOADED' as never)

    expect(item).toMatchObject({ itemType: 'SSP_UPLOADED', status: 'CONFIRMED', lastUpdatedByType: 'C3PAO' })
    expect(item.c3paoConfirmedAt).toBeTruthy()
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toMatch(/INSERT INTO local_customer_readiness/)
    expect(sql).toMatch(/ON CONFLICT [\s\S]*DO UPDATE/)
    expect(params.slice(0, 2)).toEqual(['eng-1', 'SSP_UPLOADED'])
  })
})
