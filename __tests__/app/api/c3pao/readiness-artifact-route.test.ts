import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn(), requireLeadAssessor: vi.fn() }))
vi.mock('@/lib/db-readiness', () => ({
  getArtifactContent: vi.fn(),
  getArtifactEngagementId: vi.fn(),
}))

const { requireAuth, requireLeadAssessor } = await import('@/lib/auth')
const { getArtifactContent, getArtifactEngagementId } = await import('@/lib/db-readiness')

async function getHandler() {
  const mod = await import('@/app/api/c3pao/readiness/artifact/[id]/route')
  return mod.GET
}

const req = () => new NextRequest('http://localhost/api/c3pao/readiness/artifact/a1')
const ctx = { params: Promise.resolve({ id: 'a1' }) }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('readiness artifact route scoping (M3)', () => {
  it('401 when unauthenticated, without touching the artifact', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null)
    const res = await (await getHandler())(req(), ctx)
    expect(res.status).toBe(401)
    expect(getArtifactEngagementId).not.toHaveBeenCalled()
  })

  it('403 when the caller is not lead of the artifact\'s engagement (IDOR blocked)', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ c3paoUser: { id: 'u1' } } as never)
    vi.mocked(getArtifactEngagementId).mockResolvedValue('eng-9')
    vi.mocked(requireLeadAssessor).mockResolvedValue({ session: {}, isLead: false } as never)

    const res = await (await getHandler())(req(), ctx)
    expect(res.status).toBe(403)
    expect(requireLeadAssessor).toHaveBeenCalledWith('eng-9')
    expect(getArtifactContent).not.toHaveBeenCalled()
  })

  it('404 when the artifact does not resolve to an engagement', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ c3paoUser: { id: 'u1' } } as never)
    vi.mocked(getArtifactEngagementId).mockResolvedValue(null)
    const res = await (await getHandler())(req(), ctx)
    expect(res.status).toBe(404)
  })

  it('streams the artifact for the engagement lead', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ c3paoUser: { id: 'u1' } } as never)
    vi.mocked(getArtifactEngagementId).mockResolvedValue('eng-9')
    vi.mocked(requireLeadAssessor).mockResolvedValue({ session: {}, isLead: true } as never)
    vi.mocked(getArtifactContent).mockResolvedValue({
      engagementId: 'eng-9',
      filename: 'f.pdf',
      mimeType: 'application/pdf',
      content: Buffer.from('hi'),
    })

    const res = await (await getHandler())(req(), ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
  })
})
