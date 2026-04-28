import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { OutsideEngagement } from '@/lib/outside-engagement-types'

const mockRequireAuth = vi.fn()
const mockRequireOutsideLead = vi.fn()
const mockInsert = vi.fn()
const mockList = vi.fn()
const mockGet = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/auth', () => ({
  requireAuth: mockRequireAuth,
  requireOutsideLeadAssessor: mockRequireOutsideLead,
}))

vi.mock('@/lib/db-outside-engagement', () => ({
  insertOutsideEngagement: mockInsert,
  listOutsideEngagements: mockList,
  getOutsideEngagementById: mockGet,
  updateOutsideEngagement: mockUpdate,
  deleteOutsideEngagement: mockDelete,
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const {
  createOutsideEngagement,
  listOutsideEngagementsAction,
  getOutsideEngagementByIdAction,
  updateOutsideEngagement: updateAction,
  deleteOutsideEngagement: deleteAction,
} = await import('@/app/actions/c3pao-outside-engagement')

const SESSION = {
  c3paoUser: {
    id: 'user-1',
    email: 'user@x',
    name: 'U',
    c3paoId: 'c1',
    c3paoName: 'C1',
    isLeadAssessor: false,
    status: 'active',
  },
  apiToken: 'tok',
  expires: new Date(Date.now() + 3600_000).toISOString(),
}

const VALID_INPUT = {
  name: 'Acme L2',
  clientName: 'Acme Corp',
  clientPocName: 'Jane Doe',
  clientPocEmail: 'jane@acme.example',
  scope: 'L2 scope',
  targetLevel: 'L2' as const,
  leadAssessorId: 'assessor-1',
  leadAssessorName: 'Lead Smith',
  scheduledStartDate: '2026-05-01',
  scheduledEndDate: '2026-05-31',
}

const SAMPLE_ENG: OutsideEngagement = {
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'outside_osc',
  name: VALID_INPUT.name,
  clientName: VALID_INPUT.clientName,
  clientPocName: VALID_INPUT.clientPocName,
  clientPocEmail: VALID_INPUT.clientPocEmail,
  scope: VALID_INPUT.scope,
  targetLevel: 'L2',
  status: 'PLANNING',
  leadAssessorId: 'assessor-1',
  leadAssessorName: 'Lead Smith',
  scheduledStartDate: '2026-05-01',
  scheduledEndDate: '2026-05-31',
  createdBy: 'user-1',
  createdAt: '2026-04-27T00:00:00Z',
  updatedAt: '2026-04-27T00:00:00Z',
}

describe('createOutsideEngagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated callers', async () => {
    mockRequireAuth.mockResolvedValueOnce(null)
    const result = await createOutsideEngagement(VALID_INPUT)
    expect(result).toEqual({ success: false, error: 'Unauthorized' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects empty name', async () => {
    mockRequireAuth.mockResolvedValueOnce(SESSION)
    const result = await createOutsideEngagement({ ...VALID_INPUT, name: '   ' })
    expect(result.success).toBe(false)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects empty clientName', async () => {
    mockRequireAuth.mockResolvedValueOnce(SESSION)
    const result = await createOutsideEngagement({ ...VALID_INPUT, clientName: '' })
    expect(result.success).toBe(false)
  })

  it('rejects malformed POC email', async () => {
    mockRequireAuth.mockResolvedValueOnce(SESSION)
    const result = await createOutsideEngagement({ ...VALID_INPUT, clientPocEmail: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects end date before start date', async () => {
    mockRequireAuth.mockResolvedValueOnce(SESSION)
    const result = await createOutsideEngagement({
      ...VALID_INPUT,
      scheduledStartDate: '2026-06-01',
      scheduledEndDate: '2026-05-15',
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/end date/i)
  })

  it('rejects malformed date strings', async () => {
    mockRequireAuth.mockResolvedValueOnce(SESSION)
    const result = await createOutsideEngagement({ ...VALID_INPUT, scheduledStartDate: '2026/05/01' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid target level', async () => {
    mockRequireAuth.mockResolvedValueOnce(SESSION)
    const result = await createOutsideEngagement({ ...VALID_INPUT, targetLevel: 'L4' })
    expect(result.success).toBe(false)
  })

  it('inserts and returns the created engagement on valid input', async () => {
    mockRequireAuth.mockResolvedValueOnce(SESSION)
    mockInsert.mockResolvedValueOnce(SAMPLE_ENG)
    const result = await createOutsideEngagement(VALID_INPUT)
    expect(result.success).toBe(true)
    expect(result.data?.id).toBe(SAMPLE_ENG.id)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ ...VALID_INPUT, createdBy: 'user-1' }),
    )
  })

  it('surfaces DB errors as ActionResult.error', async () => {
    mockRequireAuth.mockResolvedValueOnce(SESSION)
    mockInsert.mockRejectedValueOnce(new Error('DB down'))
    const result = await createOutsideEngagement(VALID_INPUT)
    expect(result.success).toBe(false)
    expect(result.error).toContain('DB down')
  })
})

describe('listOutsideEngagementsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated callers', async () => {
    mockRequireAuth.mockResolvedValueOnce(null)
    const result = await listOutsideEngagementsAction()
    expect(result.success).toBe(false)
    expect(mockList).not.toHaveBeenCalled()
  })

  it('returns the list on success', async () => {
    mockRequireAuth.mockResolvedValueOnce(SESSION)
    mockList.mockResolvedValueOnce([SAMPLE_ENG, SAMPLE_ENG])
    const result = await listOutsideEngagementsAction()
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
  })
})

describe('getOutsideEngagementByIdAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null data when engagement not found (not an error)', async () => {
    mockRequireAuth.mockResolvedValueOnce(SESSION)
    mockGet.mockResolvedValueOnce(null)
    const result = await getOutsideEngagementByIdAction('missing')
    expect(result.success).toBe(true)
    expect(result.data).toBeNull()
  })

  it('returns the engagement on success', async () => {
    mockRequireAuth.mockResolvedValueOnce(SESSION)
    mockGet.mockResolvedValueOnce(SAMPLE_ENG)
    const result = await getOutsideEngagementByIdAction(SAMPLE_ENG.id)
    expect(result.data?.id).toBe(SAMPLE_ENG.id)
  })
})

describe('updateOutsideEngagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects when not lead', async () => {
    mockRequireOutsideLead.mockResolvedValueOnce({ session: SESSION, isLead: false })
    const result = await updateAction(SAMPLE_ENG.id, { status: 'IN_PROGRESS' })
    expect(result.success).toBe(false)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects when no session', async () => {
    mockRequireOutsideLead.mockResolvedValueOnce({ session: null, isLead: false })
    const result = await updateAction(SAMPLE_ENG.id, { status: 'IN_PROGRESS' })
    expect(result.success).toBe(false)
  })

  it('updates and returns the engagement on success', async () => {
    mockRequireOutsideLead.mockResolvedValueOnce({ session: SESSION, isLead: true })
    mockUpdate.mockResolvedValueOnce({ ...SAMPLE_ENG, status: 'IN_PROGRESS' })
    const result = await updateAction(SAMPLE_ENG.id, { status: 'IN_PROGRESS' })
    expect(result.success).toBe(true)
    expect(result.data?.status).toBe('IN_PROGRESS')
  })

  it('returns error when engagement not found', async () => {
    mockRequireOutsideLead.mockResolvedValueOnce({ session: SESSION, isLead: true })
    mockUpdate.mockResolvedValueOnce(null)
    const result = await updateAction('missing', { status: 'IN_PROGRESS' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not found/i)
  })

  it('rejects malformed patch', async () => {
    mockRequireOutsideLead.mockResolvedValueOnce({ session: SESSION, isLead: true })
    const result = await updateAction(SAMPLE_ENG.id, { clientPocEmail: 'bad-email' })
    expect(result.success).toBe(false)
  })
})

describe('deleteOutsideEngagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects when not lead', async () => {
    mockRequireOutsideLead.mockResolvedValueOnce({ session: SESSION, isLead: false })
    const result = await deleteAction(SAMPLE_ENG.id)
    expect(result.success).toBe(false)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('returns error when engagement not found', async () => {
    mockRequireOutsideLead.mockResolvedValueOnce({ session: SESSION, isLead: true })
    mockDelete.mockResolvedValueOnce(false)
    const result = await deleteAction('missing')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not found/i)
  })

  it('deletes successfully when lead and exists', async () => {
    mockRequireOutsideLead.mockResolvedValueOnce({ session: SESSION, isLead: true })
    mockDelete.mockResolvedValueOnce(true)
    const result = await deleteAction(SAMPLE_ENG.id)
    expect(result).toEqual({ success: true, data: true })
  })
})
