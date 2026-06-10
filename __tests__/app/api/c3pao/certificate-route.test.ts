import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn() }))
vi.mock('@/app/actions/c3pao-certificate', () => ({
  getCertificateDataForEngagement: vi.fn(),
}))
// @react-pdf/renderer + the cert template are heavy and irrelevant to the auth
// gate; stub them so importing the route doesn't pull in PDF internals.
vi.mock('@react-pdf/renderer', () => ({ renderToBuffer: vi.fn() }))
vi.mock('@/lib/pdf-templates/cmmc-certificate', () => ({ CMMCCertificate: () => null }))

const { requireAuth } = await import('@/lib/auth')
const { getCertificateDataForEngagement } = await import('@/app/actions/c3pao-certificate')

async function getHandler() {
  const mod = await import('@/app/api/c3pao/engagements/[id]/certificate/route')
  return mod.GET
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('certificate route auth (M6)', () => {
  it('returns 401 and never enters the data path when unauthenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue(null)
    const res = await (await getHandler())(
      new NextRequest('http://localhost/api/c3pao/engagements/eng1/certificate'),
      { params: Promise.resolve({ id: 'eng1' }) },
    )
    expect(res.status).toBe(401)
    expect(getCertificateDataForEngagement).not.toHaveBeenCalled()
  })
})
