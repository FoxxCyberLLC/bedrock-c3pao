/**
 * Local (air-gapped) portfolio + workload aggregates — Task 20 (dashboard).
 *
 * These are COMPUTED locally over the engagements present in THIS container (imported + outside),
 * NOT platform-wide. C3PAO-org-local. No network.
 */
import { query } from '@/lib/db'
import { getLocalEngagementSummaries } from './engagements'
import { getLocalObjectives } from './objectives'
import type { PortfolioStats, PortfolioListItem, AssessorWorkloadItem } from '@/lib/api-client'

/** One portfolio row per imported engagement, with locally-computed objective progress. */
export async function getLocalPortfolioList(): Promise<PortfolioListItem[]> {
  const summaries = await getLocalEngagementSummaries()
  return Promise.all(
    summaries.map(async (e) => {
      const objectives = await getLocalObjectives(e.id)
      return {
        id: e.id,
        packageName: e.packageName,
        organizationName: e.organizationName,
        status: e.status,
        currentPhase: null,
        leadAssessorId: e.leadAssessorId,
        leadAssessorName: e.leadAssessorName,
        scheduledStartDate: e.scheduledStartDate,
        scheduledEndDate: e.scheduledEndDate,
        daysInPhase: 0,
        objectivesTotal: objectives.length,
        objectivesAssessed: objectives.filter((o) => o.status !== 'NOT_ASSESSED').length,
        assessmentResult: e.assessmentResult,
        certStatus: null,
        certExpiresAt: null,
        poamCloseoutDue: null,
        reevalWindowOpenUntil: null,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      }
    })
  )
}

/** Portfolio summary tiles computed from the local engagement list. */
export async function getLocalPortfolioStats(): Promise<PortfolioStats> {
  const list = await getLocalPortfolioList()
  return {
    activeCount: list.filter((e) => e.status === 'IN_PROGRESS').length,
    atRiskCount: list.filter((e) => e.assessmentResult === 'CONDITIONAL' || e.status === 'AWAITING_OSC_CORRECTIONS').length,
    preBriefThisWeek: 0,
    qaDueCount: 0,
    certsExpiring30d: 0,
    poamCloseoutsDue: 0,
    throughputLast8Weeks: [0, 0, 0, 0, 0, 0, 0, 0],
  }
}

/** Per-assessor workload computed from local accounts + team assignments. */
export async function getLocalWorkload(): Promise<AssessorWorkloadItem[]> {
  const result = await query(
    `SELECT u.id, u.name, u.email, u.role,
            COALESCE(t.assigned, 0) AS assigned
       FROM local_users u
       LEFT JOIN (
         SELECT assessor_id, COUNT(*)::int AS assigned
           FROM local_engagement_team GROUP BY assessor_id
       ) t ON t.assessor_id = u.id
      WHERE u.role IN ('assessor', 'lead_assessor')
      ORDER BY u.name`
  )
  return result.rows.map((r) => ({
    assessorId: String(r.id),
    assessorName: String(r.name ?? ''),
    assessorEmail: String(r.email ?? ''),
    assessorType: r.role === 'lead_assessor' ? 'LEAD' : 'ASSESSOR',
    isLeadAssessor: r.role === 'lead_assessor',
    activeEngagements: Number(r.assigned ?? 0),
    pendingEngagements: 0,
    completedEngagements: 0,
    objectivesAssessed: 0,
    domainsAssigned: 0,
    ccaExpiresAt: null,
    ccpExpiresAt: null,
    engagements: [],
    skills: [],
  }))
}
