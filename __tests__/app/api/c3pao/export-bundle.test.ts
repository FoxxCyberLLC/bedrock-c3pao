import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const appendMock = vi.fn()
const finalizeMock = vi.fn().mockResolvedValue(undefined)
const onMock = vi.fn()
const destroyMock = vi.fn()
const fakeArchive = {
  append: appendMock,
  finalize: finalizeMock,
  on: onMock,
  destroy: destroyMock,
}

vi.mock('archiver', () => ({ default: vi.fn(() => fakeArchive) }))
// The route does Readable.toWeb(archive) — stub it so we don't need a real stream.
vi.mock('node:stream', () => ({
  Readable: { toWeb: vi.fn(() => new ReadableStream()) },
}))

vi.mock('@/lib/auth', () => ({ requireLeadAssessor: vi.fn() }))
vi.mock('@/lib/db-readiness', () => ({ getItems: vi.fn(), getArtifactContent: vi.fn() }))
vi.mock('@/lib/db-audit', () => ({ getAuditLog: vi.fn(), appendAudit: vi.fn() }))
vi.mock('@/lib/db-notes', () => ({ listNotes: vi.fn(), listRevisions: vi.fn() }))

const { requireLeadAssessor } = await import('@/lib/auth')
const { getItems, getArtifactContent } = await import('@/lib/db-readiness')
const { getAuditLog, appendAudit } = await import('@/lib/db-audit')
const { listNotes } = await import('@/lib/db-notes')

async function getHandler() {
  const mod = await import('@/app/api/c3pao/engagements/[id]/export-bundle/route')
  return mod.GET
}

const FOUR_HUNDRED_MB = 400 * 1024 * 1024

beforeEach(() => {
  vi.clearAllMocks()
  finalizeMock.mockResolvedValue(undefined)
  vi.mocked(requireLeadAssessor).mockResolvedValue({
    session: { c3paoUser: { id: 'u1', name: 'Lead', email: 'l@x.com' } },
    isLead: true,
  } as never)
  vi.mocked(getAuditLog).mockResolvedValue([] as never)
  vi.mocked(appendAudit).mockResolvedValue(undefined as never)
  vi.mocked(listNotes).mockResolvedValue([] as never)
})

const appendedNames = () => appendMock.mock.calls.map((c) => (c[1] as { name: string }).name)

describe('export-bundle aggregate cap (B-MEDIUM)', () => {
  it('skips artifacts over the aggregate byte cap and records them in _SKIPPED.json', async () => {
    vi.mocked(getItems).mockResolvedValue([
      { id: 'i1', artifacts: [{ id: 'a1' }] },
      { id: 'i2', artifacts: [{ id: 'a2' }] },
    ] as never)
    // Fake blobs: only `content.length` is read (archive.append is mocked), so
    // no real allocation is needed. Two 400MB artifacts exceed the 500MB cap.
    vi.mocked(getArtifactContent).mockImplementation(
      async (id: string) =>
        ({ filename: `${id}.bin`, content: { length: FOUR_HUNDRED_MB } }) as never,
    )

    const GET = await getHandler()
    const res = await GET(new NextRequest('http://localhost/api/c3pao/engagements/eng1/export-bundle'), {
      params: Promise.resolve({ id: 'eng1' }),
    })

    expect(res.status).toBe(200)
    const names = appendedNames()
    // First artifact fits; second is over the cap and skipped.
    expect(names.some((n) => n.includes('a1__'))).toBe(true)
    expect(names.some((n) => n.includes('a2__'))).toBe(false)
    expect(names).toContain('readiness/artifacts/_SKIPPED.json')
  })

  it('finalizes the archive (no swallowed void) and includes all artifacts under the cap', async () => {
    vi.mocked(getItems).mockResolvedValue([{ id: 'i1', artifacts: [{ id: 'a1' }] }] as never)
    vi.mocked(getArtifactContent).mockResolvedValue({
      filename: 'small.pdf',
      content: { length: 1024 },
    } as never)

    const GET = await getHandler()
    await GET(new NextRequest('http://localhost/api/c3pao/engagements/eng1/export-bundle'), {
      params: Promise.resolve({ id: 'eng1' }),
    })

    expect(finalizeMock).toHaveBeenCalledOnce()
    const names = appendedNames()
    expect(names.some((n) => n.includes('a1__'))).toBe(true)
    expect(names).not.toContain('readiness/artifacts/_SKIPPED.json')
  })
})
