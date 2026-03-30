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

// Helper to import the route handler fresh each test
async function getHandler() {
  const mod = await import('@/app/api/evidence/[engagementId]/[evidenceId]/proxy/route')
  return mod.GET
}

function makeRequest(engagementId = 'eng1', evidenceId = 'ev1') {
  return new NextRequest(`http://localhost/api/evidence/${engagementId}/${evidenceId}/proxy`)
}

function upstreamResponse(body: string | Uint8Array<ArrayBufferLike>, contentType: string, contentLength?: number) {
  const headers: Record<string, string> = { 'content-type': contentType }
  if (contentLength !== undefined) headers['content-length'] = String(contentLength)
  return new Response(body as BodyInit, { status: 200, headers })
}

beforeEach(() => {
  vi.mocked(requireAuth).mockResolvedValue({ apiToken: 'tok', email: 'a@b.com' } as any)
  vi.mocked(fetchEvidenceDownloadURL).mockResolvedValue({ downloadUrl: 'https://s3.example.com/file' } as any)
  vi.stubGlobal('fetch', vi.fn())
})

describe('evidence proxy', () => {
  it('returns 401 without auth', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(null)
    const GET = await getHandler()
    const res = await GET(makeRequest(), { params: Promise.resolve({ engagementId: 'eng1', evidenceId: 'ev1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 413 when Content-Length exceeds 25MB', async () => {
    const overLimit = 26 * 1024 * 1024
    vi.mocked(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      upstreamResponse('x', 'application/pdf', overLimit),
    )
    const GET = await getHandler()
    const res = await GET(makeRequest(), { params: Promise.resolve({ engagementId: 'eng1', evidenceId: 'ev1' }) })
    expect(res.status).toBe(413)
  })

  it('passes through application/pdf Content-Type unchanged', async () => {
    vi.mocked(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      upstreamResponse('%PDF-1.4', 'application/pdf'),
    )
    const GET = await getHandler()
    const res = await GET(makeRequest(), { params: Promise.resolve({ engagementId: 'eng1', evidenceId: 'ev1' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
  })

  it('sanitizes dangerous text/html Content-Type to application/octet-stream', async () => {
    vi.mocked(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      upstreamResponse('<html><script>alert(1)</script></html>', 'text/html; charset=utf-8'),
    )
    const GET = await getHandler()
    const res = await GET(makeRequest(), { params: Promise.resolve({ engagementId: 'eng1', evidenceId: 'ev1' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/octet-stream')
  })

  it('sanitizes text/javascript Content-Type to application/octet-stream', async () => {
    vi.mocked(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      upstreamResponse('alert(1)', 'text/javascript'),
    )
    const GET = await getHandler()
    const res = await GET(makeRequest(), { params: Promise.resolve({ engagementId: 'eng1', evidenceId: 'ev1' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/octet-stream')
  })

  it('passes through image/png Content-Type', async () => {
    vi.mocked(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      upstreamResponse(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), 'image/png'),
    )
    const GET = await getHandler()
    const res = await GET(makeRequest(), { params: Promise.resolve({ engagementId: 'eng1', evidenceId: 'ev1' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
  })

  it('includes X-Content-Type-Options: nosniff header', async () => {
    vi.mocked(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      upstreamResponse('%PDF-1.4', 'application/pdf'),
    )
    const GET = await getHandler()
    const res = await GET(makeRequest(), { params: Promise.resolve({ engagementId: 'eng1', evidenceId: 'ev1' }) })
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('sets Content-Disposition: inline for displayable types (PDF)', async () => {
    vi.mocked(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      upstreamResponse('%PDF-1.4', 'application/pdf'),
    )
    const GET = await getHandler()
    const res = await GET(makeRequest(), { params: Promise.resolve({ engagementId: 'eng1', evidenceId: 'ev1' }) })
    expect(res.headers.get('content-disposition')).toBe('inline')
  })

  it('sets Content-Disposition: attachment for non-displayable types', async () => {
    vi.mocked(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      upstreamResponse('<html></html>', 'text/html'),
    )
    const GET = await getHandler()
    const res = await GET(makeRequest(), { params: Promise.resolve({ engagementId: 'eng1', evidenceId: 'ev1' }) })
    expect(res.headers.get('content-disposition')).toBe('attachment')
  })
})
