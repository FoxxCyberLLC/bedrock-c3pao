import { describe, it, expect } from 'vitest'

import {
  collectActiveEngagementIds,
  deriveAssessorActivity,
  selectActiveEngagements,
  unionFamilyCodes,
} from '@/lib/workload/assessment-activity'
import type {
  AssessorWorkloadItem,
  TeamMember,
  WorkloadEngagement,
} from '@/lib/api-client'

function eng(
  partial: Partial<WorkloadEngagement> & { id: string; status: string },
): WorkloadEngagement {
  return {
    packageName: partial.packageName ?? 'Pkg',
    organizationName: partial.organizationName ?? 'Org',
    role: partial.role ?? 'ASSESSOR',
    currentPhase: partial.currentPhase,
    ...partial,
  }
}

function member(
  partial: Partial<TeamMember> & { assessorId: string; domains: string[] },
): TeamMember {
  return {
    id: partial.id ?? `tm-${partial.assessorId}`,
    name: partial.name ?? 'Test Assessor',
    email: partial.email ?? 'a@example.com',
    role: partial.role ?? 'ASSESSOR',
    assessorType: partial.assessorType ?? 'CCA',
    jobTitle: partial.jobTitle,
    assignedAt: partial.assignedAt ?? '2026-01-01T00:00:00Z',
    ...partial,
  }
}

function assessor(
  partial: Partial<AssessorWorkloadItem> & {
    assessorId: string
    engagements: WorkloadEngagement[]
  },
): AssessorWorkloadItem {
  return {
    assessorName: partial.assessorName ?? 'Test',
    assessorEmail: partial.assessorEmail ?? 'a@example.com',
    assessorType: partial.assessorType ?? 'CCA',
    isLeadAssessor: partial.isLeadAssessor ?? false,
    activeEngagements: partial.activeEngagements ?? 0,
    pendingEngagements: partial.pendingEngagements ?? 0,
    completedEngagements: partial.completedEngagements ?? 0,
    objectivesAssessed: partial.objectivesAssessed ?? 0,
    domainsAssigned: partial.domainsAssigned ?? 0,
    ccaExpiresAt: partial.ccaExpiresAt ?? null,
    ccpExpiresAt: partial.ccpExpiresAt ?? null,
    skills: partial.skills ?? [],
    ...partial,
  }
}

describe('selectActiveEngagements', () => {
  it('drops only COMPLETED engagements', () => {
    const result = selectActiveEngagements([
      eng({ id: 'a', status: 'IN_PROGRESS' }),
      eng({ id: 'b', status: 'COMPLETED' }),
      eng({ id: 'c', status: 'PENDING_APPROVAL' }),
      eng({ id: 'd', status: 'COMPLETED' }),
    ])
    expect(result.map((e) => e.id)).toEqual(['a', 'c'])
  })

  it('returns empty array for an empty input', () => {
    expect(selectActiveEngagements([])).toEqual([])
  })
})

describe('unionFamilyCodes', () => {
  it('returns codes in canonical NIST order, deduplicated', () => {
    const teams = new Map<string, TeamMember[]>([
      ['e1', [member({ assessorId: 'u1', domains: ['SI', 'AC'] })]],
      ['e2', [member({ assessorId: 'u1', domains: ['AC', 'IR'] })]],
    ])
    expect(unionFamilyCodes(teams, 'u1')).toEqual(['AC', 'IR', 'SI'])
  })

  it('ignores other assessors and unknown family codes', () => {
    const teams = new Map<string, TeamMember[]>([
      [
        'e1',
        [
          member({ assessorId: 'u1', domains: ['AC', 'NOT_REAL'] }),
          member({ assessorId: 'u2', domains: ['AU'] }),
        ],
      ],
    ])
    expect(unionFamilyCodes(teams, 'u1')).toEqual(['AC'])
  })

  it('returns empty array when assessor has no team membership', () => {
    const teams = new Map<string, TeamMember[]>([
      ['e1', [member({ assessorId: 'someone-else', domains: ['AC'] })]],
    ])
    expect(unionFamilyCodes(teams, 'u1')).toEqual([])
  })
})

describe('deriveAssessorActivity', () => {
  it('joins workload + team data into a complete row', () => {
    const a = assessor({
      assessorId: 'u1',
      assessorName: 'Alex',
      objectivesAssessed: 42,
      engagements: [
        eng({
          id: 'e1',
          status: 'IN_PROGRESS',
          packageName: 'Acme L2',
          organizationName: 'Acme',
        }),
        eng({
          id: 'e2',
          status: 'COMPLETED',
          packageName: 'Old',
          organizationName: 'OldCorp',
        }),
      ],
    })
    const teams = new Map<string, TeamMember[]>([
      ['e1', [member({ assessorId: 'u1', domains: ['IR', 'AC'] })]],
      // e2 deliberately absent — completed engagements aren't fetched.
    ])
    const result = deriveAssessorActivity(a, teams)
    expect(result.assessorId).toBe('u1')
    expect(result.assessorName).toBe('Alex')
    expect(result.activeEngagements).toBe(1)
    expect(result.activeEngagementList.map((e) => e.id)).toEqual(['e1'])
    expect(result.objectivesAssessed).toBe(42)
    expect(result.familyCodes).toEqual(['AC', 'IR'])
    expect(result.domainsAssigned).toBe(2)
  })

  it('tolerates missing team data (treats as empty domain set)', () => {
    const a = assessor({
      assessorId: 'u1',
      engagements: [eng({ id: 'e1', status: 'IN_PROGRESS' })],
    })
    const result = deriveAssessorActivity(a, new Map())
    expect(result.familyCodes).toEqual([])
    expect(result.domainsAssigned).toBe(0)
    expect(result.activeEngagements).toBe(1)
  })
})

describe('collectActiveEngagementIds', () => {
  it('collects unique active engagement ids across assessors', () => {
    const a = assessor({
      assessorId: 'u1',
      engagements: [
        eng({ id: 'e1', status: 'IN_PROGRESS' }),
        eng({ id: 'e2', status: 'COMPLETED' }),
      ],
    })
    const b = assessor({
      assessorId: 'u2',
      engagements: [
        eng({ id: 'e1', status: 'IN_PROGRESS' }),
        eng({ id: 'e3', status: 'PENDING' }),
      ],
    })
    const ids = collectActiveEngagementIds([a, b])
    expect(ids.sort()).toEqual(['e1', 'e3'])
  })

  it('returns empty for no assessors', () => {
    expect(collectActiveEngagementIds([])).toEqual([])
  })
})
