/**
 * Pure aggregation helpers for the Workload page's "Assessment Activity" card.
 *
 * Replaces the old hard-coded skill / domain proficiency matrix with metrics
 * derived from real engagement data already returned by the workload endpoint
 * plus the per-engagement team endpoint:
 *
 *   - active engagement count + the actual engagement list (linkable)
 *   - total objectives assessed across that assessor's engagements
 *   - distinct CMMC family domains that assessor is currently responsible for
 *     (union across active engagements; same source as the team card chips)
 *
 * Lives in `lib/workload/` so it's shared between the server action and the
 * client component, and so the math is testable in pure node.
 */
import type {
  AssessorWorkloadItem,
  TeamMember,
  WorkloadEngagement,
} from '@/lib/api-client'
import { CMMC_FAMILY_CODES } from '@/lib/cmmc/families'

/** Engagement statuses that should NOT count as "currently being worked". */
const COMPLETED_STATUSES: ReadonlySet<string> = new Set(['COMPLETED'])

/**
 * One row of the Assessment Activity table — everything the card needs,
 * fully derived. No I/O, no React.
 */
export interface AssessorActivityItem {
  assessorId: string
  assessorName: string
  assessorEmail: string
  assessorType: string
  isLeadAssessor: boolean
  /** Number of non-completed engagements the assessor is on. */
  activeEngagements: number
  /** Engagements considered active — used for chip rendering / linking. */
  activeEngagementList: WorkloadEngagement[]
  /** Cumulative objectives assessed across all of this assessor's engagements. */
  objectivesAssessed: number
  /**
   * Sorted (canonical NIST family order), de-duplicated list of family codes
   * the assessor is currently assigned across their active engagements.
   */
  familyCodes: string[]
  /** Convenience — `familyCodes.length`. */
  domainsAssigned: number
}

/**
 * Filter an assessor's engagement list down to the ones we treat as "active"
 * for activity tracking. We include anything that isn't explicitly COMPLETED
 * — pending / in-progress / pre-assess all count.
 */
export function selectActiveEngagements(
  engagements: ReadonlyArray<WorkloadEngagement>,
): WorkloadEngagement[] {
  return engagements.filter((e) => !COMPLETED_STATUSES.has(e.status))
}

/**
 * Given the team rosters for each of an assessor's active engagements, return
 * the canonical, sorted, de-duplicated list of CMMC family codes they're
 * responsible for. Codes that aren't in `CMMC_FAMILY_CODES` are dropped
 * (defensive — the Go API is authoritative but we don't want a typo to break
 * sort order).
 */
export function unionFamilyCodes(
  teamsByEngagement: ReadonlyMap<string, ReadonlyArray<TeamMember>>,
  assessorId: string,
): string[] {
  const seen = new Set<string>()
  for (const team of teamsByEngagement.values()) {
    const member = team.find((m) => m.assessorId === assessorId)
    if (!member) continue
    for (const code of member.domains) {
      if (CMMC_FAMILY_CODES.includes(code)) {
        seen.add(code)
      }
    }
  }
  return CMMC_FAMILY_CODES.filter((c) => seen.has(c))
}

/**
 * Produce the full activity row for one assessor. `teamsByEngagement` should
 * cover at least the assessor's active engagements; missing entries are
 * tolerated (they just don't contribute family codes).
 */
export function deriveAssessorActivity(
  assessor: AssessorWorkloadItem,
  teamsByEngagement: ReadonlyMap<string, ReadonlyArray<TeamMember>>,
): AssessorActivityItem {
  const activeEngagementList = selectActiveEngagements(assessor.engagements)
  const familyCodes = unionFamilyCodes(teamsByEngagement, assessor.assessorId)
  return {
    assessorId: assessor.assessorId,
    assessorName: assessor.assessorName,
    assessorEmail: assessor.assessorEmail,
    assessorType: assessor.assessorType,
    isLeadAssessor: assessor.isLeadAssessor,
    activeEngagements: activeEngagementList.length,
    activeEngagementList,
    objectivesAssessed: assessor.objectivesAssessed,
    familyCodes,
    domainsAssigned: familyCodes.length,
  }
}

/**
 * Collect the unique set of engagement ids that need a `fetchTeam` call to
 * populate the activity rows. Only active (non-completed) engagements are
 * fetched — we don't render chips for past work.
 */
export function collectActiveEngagementIds(
  assessors: ReadonlyArray<AssessorWorkloadItem>,
): string[] {
  const ids = new Set<string>()
  for (const a of assessors) {
    for (const e of selectActiveEngagements(a.engagements)) {
      ids.add(e.id)
    }
  }
  return [...ids]
}
