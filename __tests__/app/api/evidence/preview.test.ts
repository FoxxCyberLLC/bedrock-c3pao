import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))
vi.mock('@/lib/api-client', () => ({
  fetchEvidenceDownloadURL: vi.fn(),
}))

const { requireAuth } = await import('@/lib/auth')
const { fetchEvidenceDownloadURL } = await import('@/lib/api-client')

async function getHandler() {
  const mod = await import('@/app/api/evidence/[engagementId]/[evidenceId]/preview/route')
  return mod.GET
}

function makeRequest() {
  return new NextRequest('http://localhost/api/evidence/eng1/ev1/preview')
}

beforeEach(() => {
  vi.mocked(requireAuth).mockResolvedValue({ apiToken: 'tok', email: 'a@b.com' } as never)
  vi.mocked(fetchEvidenceDownloadURL).mockResolvedValue({
    downloadUrl: 'https://s3.example.com/file.xlsx',
  } as never)
  vi.stubGlobal('fetch', vi.fn())
})

describe('evidence preview', () => {
  it('returns 401 without auth', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(null)
    const GET = await getHandler()
    const res = await GET(makeRequest(), {
      params: Promise.resolve({ engagementId: 'eng1', evidenceId: 'ev1' }),
    })
    expect(res.status).toBe(401)
  })

  it('passes an AbortSignal timeout to the upstream fetch (B-MEDIUM)', async () => {
    vi.mocked(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'application/vnd.openxmlformats' },
      }),
    )
    const GET = await getHandler()
    // The bytes aren't a real workbook → handler ends at 422, but the upstream
    // fetch still ran with a timeout signal, which is what we assert.
    await GET(makeRequest(), {
      params: Promise.resolve({ engagementId: 'eng1', evidenceId: 'ev1' }),
    })
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    const [, opts] = fetchMock.mock.calls[0]
    expect(opts?.signal).toBeInstanceOf(AbortSignal)
  })
})
