import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Storage } from '@/lib/storage/storage'
import {
  buildGoldenSnapshot,
  GOLDEN_ENGAGEMENT_ID,
  GOLDEN_EVIDENCE_ID,
} from '../../fixtures/snapshot-v1'

/** Records upserts + evidence writes so tests assert what landed where. */
function makeHarness() {
  const queries: Array<{ sql: string; params: unknown[] }> = []
  const client = {
    query: vi.fn((sql: string, params: unknown[] = []) => {
      queries.push({ sql, params })
      return Promise.resolve({ rows: [] })
    }),
    release: vi.fn(),
  }
  const puts: Array<{ key: string; body: Buffer }> = []
  const storage: Storage = {
    put: vi.fn((key: string, body: Buffer) => {
      puts.push({ key, body })
      return Promise.resolve()
    }),
    get: vi.fn(),
    getStream: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  } as unknown as Storage
  return { queries, client, puts, storage, getClient: async () => client }
}

describe('importSnapshot', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads snapshot tables into their imp_ tables scoped by engagement', async () => {
    const { queries, storage, getClient } = makeHarness()
    const { importSnapshot } = await import('@/lib/import/import-snapshot')

    const result = await importSnapshot(await buildGoldenSnapshot(), { storage, getClient })

    const inserts = queries.filter((q) => q.sql.includes('INSERT INTO imp_'))
    expect(inserts.some((q) => q.sql.includes('imp_assessment_engagement'))).toBe(true)
    expect(inserts.some((q) => q.sql.includes('imp_objective_status'))).toBe(true)
    expect(inserts.some((q) => q.sql.includes('imp_evidence'))).toBe(true)
    // every imported row is tagged with the importing engagement id
    expect(inserts.every((q) => q.params.includes(GOLDEN_ENGAGEMENT_ID))).toBe(true)
    expect(result.engagementId).toBe(GOLDEN_ENGAGEMENT_ID)
  })

  it('is idempotent — upserts on id conflict', async () => {
    const { queries, storage, getClient } = makeHarness()
    const { importSnapshot } = await import('@/lib/import/import-snapshot')

    await importSnapshot(await buildGoldenSnapshot(), { storage, getClient })

    const inserts = queries.filter((q) => q.sql.includes('INSERT INTO imp_'))
    expect(inserts.every((q) => /ON CONFLICT [\s\S]*DO UPDATE/i.test(q.sql))).toBe(true)
  })

  it('stores evidence bytes in the Storage layer under evidence/<id>/<file>', async () => {
    const { puts, storage, getClient } = makeHarness()
    const { importSnapshot } = await import('@/lib/import/import-snapshot')

    const result = await importSnapshot(await buildGoldenSnapshot(), { storage, getClient })

    const ev = puts.find((p) => p.key.includes(GOLDEN_EVIDENCE_ID))
    expect(ev).toBeDefined()
    expect(ev?.key).toBe(`evidence/${GOLDEN_EVIDENCE_ID}/policy.txt`)
    expect(ev?.body.toString()).toContain('golden evidence body')
    expect(result.evidenceCount).toBe(1)
  })

  it('loads evidence↔objective links so control mappings are queryable', async () => {
    const { queries, storage, getClient } = makeHarness()
    const { importSnapshot } = await import('@/lib/import/import-snapshot')

    const result = await importSnapshot(await buildGoldenSnapshot(), { storage, getClient })

    expect(queries.some((q) => q.sql.includes('INSERT INTO imp_evidence_objective_link'))).toBe(true)
    expect(result.linkCount).toBe(1)
  })

  it('wraps the load in a transaction (BEGIN/COMMIT)', async () => {
    const { queries, storage, getClient } = makeHarness()
    const { importSnapshot } = await import('@/lib/import/import-snapshot')

    await importSnapshot(await buildGoldenSnapshot(), { storage, getClient })

    const verbs = queries.map((q) => q.sql.trim())
    expect(verbs[0]).toBe('BEGIN')
    expect(verbs[verbs.length - 1]).toBe('COMMIT')
  })

  it('rejects a package whose checksums do not match (integrity)', async () => {
    const { storage, getClient } = makeHarness()
    const { importSnapshot, SnapshotIntegrityError } = await import('@/lib/import/import-snapshot')

    await expect(
      importSnapshot(await buildGoldenSnapshot({ corruptChecksum: true }), { storage, getClient })
    ).rejects.toBeInstanceOf(SnapshotIntegrityError)
  })

  it('rejects an unsupported format version', async () => {
    const { storage, getClient } = makeHarness()
    const { importSnapshot, SnapshotFormatError } = await import('@/lib/import/import-snapshot')

    await expect(
      importSnapshot(await buildGoldenSnapshot({ badVersion: true }), { storage, getClient })
    ).rejects.toBeInstanceOf(SnapshotFormatError)
  })

  it('rolls back when a row load fails', async () => {
    const { storage } = makeHarness()
    const failingClient = {
      query: vi.fn((sql: string) => {
        if (sql.includes('INSERT INTO imp_')) return Promise.reject(new Error('boom'))
        return Promise.resolve({ rows: [] })
      }),
      release: vi.fn(),
    }
    const { importSnapshot } = await import('@/lib/import/import-snapshot')

    await expect(
      importSnapshot(await buildGoldenSnapshot(), { storage, getClient: async () => failingClient })
    ).rejects.toThrow('boom')
    expect(failingClient.query).toHaveBeenCalledWith('ROLLBACK')
    expect(failingClient.release).toHaveBeenCalled()
  })
})
