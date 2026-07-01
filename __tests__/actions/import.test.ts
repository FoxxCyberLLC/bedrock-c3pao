import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SnapshotIntegrityError } from '@/lib/import/import-snapshot'

const requireAuth = vi.fn()
const ensureSchema = vi.fn()
const importSnapshot = vi.fn()

vi.mock('@/lib/auth', () => ({ requireAuth: () => requireAuth() }))
vi.mock('@/lib/db', () => ({ ensureSchema: () => ensureSchema() }))
vi.mock('@/lib/storage/factory', () => ({ createStorage: () => ({}) }))
vi.mock('@/lib/import/import-snapshot', async (orig) => {
  const actual = await orig<typeof import('@/lib/import/import-snapshot')>()
  return { ...actual, importSnapshot: (...a: unknown[]) => importSnapshot(...a) }
})

const zipFile = () => new File([new Uint8Array([1, 2, 3])], 'snapshot.zip')

describe('importSnapshotAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAuth.mockResolvedValue({ apiToken: 't', c3paoUser: { id: 'u1' } })
    ensureSchema.mockResolvedValue(undefined)
  })

  it('rejects unauthenticated callers', async () => {
    requireAuth.mockResolvedValue(null)
    const { importSnapshotAction } = await import('@/app/actions/import')
    const fd = new FormData()
    fd.set('file', zipFile())

    const res = await importSnapshotAction(fd)

    expect(res).toEqual({ success: false, error: 'Unauthorized' })
    expect(importSnapshot).not.toHaveBeenCalled()
  })

  it('requires a file', async () => {
    const { importSnapshotAction } = await import('@/app/actions/import')
    const res = await importSnapshotAction(new FormData())
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/required/i)
  })

  it('rejects an empty file', async () => {
    const { importSnapshotAction } = await import('@/app/actions/import')
    const fd = new FormData()
    fd.set('file', new File([], 'snapshot.zip'))
    const res = await importSnapshotAction(fd)
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/empty/i)
  })

  it('imports a valid package and returns the result', async () => {
    importSnapshot.mockResolvedValue({
      engagementId: 'eng-1',
      tables: { assessment_engagement: 1 },
      evidenceCount: 1,
      linkCount: 1,
      skippedTables: [],
    })
    const { importSnapshotAction } = await import('@/app/actions/import')
    const fd = new FormData()
    fd.set('file', zipFile())

    const res = await importSnapshotAction(fd)

    expect(res.success).toBe(true)
    expect(res.data?.engagementId).toBe('eng-1')
    expect(ensureSchema).toHaveBeenCalled()
  })

  it('surfaces integrity failures as a user-facing error', async () => {
    importSnapshot.mockRejectedValue(new SnapshotIntegrityError('checksum mismatch: tables/Organization.json'))
    const { importSnapshotAction } = await import('@/app/actions/import')
    const fd = new FormData()
    fd.set('file', zipFile())

    const res = await importSnapshotAction(fd)

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/checksum mismatch/)
  })

  it('masks unexpected failures', async () => {
    importSnapshot.mockRejectedValue(new Error('db exploded'))
    const { importSnapshotAction } = await import('@/app/actions/import')
    const fd = new FormData()
    fd.set('file', zipFile())

    const res = await importSnapshotAction(fd)

    expect(res.success).toBe(false)
    expect(res.error).not.toMatch(/exploded/)
  })
})
