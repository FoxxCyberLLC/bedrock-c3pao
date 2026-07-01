import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
vi.mock('@/lib/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

describe('lib/local/team', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists the engagement team, resolving identity from local_users', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ assessor_id: 'a1', role: 'LEAD_ASSESSOR', domains: ['AC'], assigned_at: '2026-06-01', name: 'Lead', email: 'l@c3.test', user_role: 'lead_assessor' }],
    })
    const { getLocalTeam } = await import('@/lib/local/team')

    const team = await getLocalTeam('eng-1')

    expect(team[0]).toMatchObject({ assessorId: 'a1', name: 'Lead', role: 'LEAD_ASSESSOR', assessorType: 'LEAD', domains: ['AC'] })
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toContain('local_engagement_team')
    expect(sql).toContain('JOIN local_users')
  })

  it('lists available assessors not already on the team', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'a2', name: 'Other', email: 'o@c3.test', role: 'assessor' }] })
    const { getLocalAvailableAssessors } = await import('@/lib/local/team')

    const available = await getLocalAvailableAssessors('eng-1')

    expect(available[0]).toMatchObject({ assessorId: 'a2', name: 'Other', assessorType: 'ASSESSOR' })
    expect(mockQuery.mock.calls[0][0]).toContain('NOT IN (SELECT assessor_id FROM local_engagement_team')
  })

  it('adds a team member (upsert on conflict)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { addLocalTeamMember } = await import('@/lib/local/team')

    await addLocalTeamMember('eng-1', 'a1', 'LEAD_ASSESSOR')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toMatch(/INSERT INTO local_engagement_team/)
    expect(sql).toMatch(/ON CONFLICT .*DO UPDATE/)
    expect(params).toEqual(['eng-1', 'a1', 'LEAD_ASSESSOR'])
  })

  it('sets assessor domains as a JSONB array', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { setLocalAssessorDomains } = await import('@/lib/local/team')

    await setLocalAssessorDomains('eng-1', 'a1', ['AC', 'AU'])

    expect(JSON.parse(mockQuery.mock.calls[0][1][2] as string)).toEqual(['AC', 'AU'])
  })

  it('isLocalEngagementLead is true only for a LEAD_ASSESSOR row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
    const { isLocalEngagementLead } = await import('@/lib/local/team')

    expect(await isLocalEngagementLead('eng-1', 'a1')).toBe(true)
    expect(mockQuery.mock.calls[0][0]).toContain("role = 'LEAD_ASSESSOR'")
  })

  it('removes a team member', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const { removeLocalTeamMember } = await import('@/lib/local/team')

    await removeLocalTeamMember('eng-1', 'a1')

    expect(mockQuery.mock.calls[0][0]).toMatch(/DELETE FROM local_engagement_team/)
  })
})
