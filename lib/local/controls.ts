/**
 * Local (air-gapped) controls + SPRS stats — Task 12 (+ Task 11 `fetchStats`).
 *
 * Controls are the merge-at-read of the seeded reference catalog (all 110 L2 requirements +
 * families, Task 23) with the imported per-requirement status (`imp_requirement_status`, scoped
 * by the tagged `engagement_id`). Requirements with no imported status default to NOT_ASSESSED —
 * the same catalog-with-overrides pattern as `db-outside-*`. Stats compute the SPRS score locally
 * from `lib/cmmc/requirement-values` point values. No api-client, no network.
 */
import { query } from '@/lib/db'
import { cmmcRequirementValues } from '@/lib/cmmc/requirement-values'
import type { ControlView, StatsResponse, DomainStats } from '@/lib/api-client'

interface ControlRow {
  requirement_id: string
  family_code: string
  family_name: string
  title: string
  basic_requirement: string
  cmmc_level: string
  sort_order: number
  rs_id: string | null
  rsdata: Record<string, unknown> | null
}

const CONTROLS_SQL = `
  SELECT r."requirementId"      AS requirement_id,
         f.code                 AS family_code,
         f.name                 AS family_name,
         r.title                AS title,
         r."basicRequirement"   AS basic_requirement,
         r."cmmcLevel"          AS cmmc_level,
         r."sortOrder"          AS sort_order,
         rs.id                  AS rs_id,
         rs.data                AS rsdata
    FROM "Requirement" r
    JOIN "RequirementFamily" f ON f.id = r."familyId"
    LEFT JOIN imp_requirement_status rs
      ON rs.data->>'requirementId' = r."requirementId" AND rs.engagement_id = $1
   WHERE r."cmmcLevel" = 'LEVEL_2'
   ORDER BY r."sortOrder"`

function mapControl(row: ControlRow): ControlView {
  const rs = row.rsdata
  const val = (k: string): string | null => (rs && rs[k] != null ? String(rs[k]) : null)
  return {
    id: row.rs_id ?? row.requirement_id,
    requirementId: row.requirement_id,
    familyCode: row.family_code,
    familyName: row.family_name,
    title: row.title,
    basicRequirement: row.basic_requirement,
    cmmcLevel: row.cmmc_level,
    sortOrder: Number(row.sort_order),
    status: val('status') ?? 'NOT_ASSESSED',
    implementationNotes: val('implementationNotes'),
    implementationType: val('implementationType'),
    processOwner: val('processOwner'),
    requirementStatusId: row.rs_id ?? '',
    assessmentNotes: val('assessmentNotes'),
  }
}

/** All 110 L2 controls for the engagement, seeded catalog merged with imported status. */
export async function getLocalControls(engagementId: string): Promise<ControlView[]> {
  const result = await query(CONTROLS_SQL, [engagementId])
  return (result.rows as ControlRow[]).map(mapControl)
}

/** Persist the assessor's control assessment notes locally (offline `updateControlNotes`). */
export async function updateLocalControlNotes(
  requirementStatusId: string,
  assessmentNotes: string
): Promise<void> {
  await query(
    `UPDATE imp_requirement_status SET data = data || $2::jsonb WHERE id = $1`,
    [requirementStatusId, JSON.stringify({ assessmentNotes })]
  )
}

function emptyDomain(familyCode: string, familyName: string): DomainStats {
  return { familyCode, familyName, total: 0, met: 0, notMet: 0, notApplicable: 0, notAssessed: 0 }
}

/** SPRS + per-domain stats computed locally from the merged controls (offline `fetchStats`). */
export async function getLocalStats(engagementId: string): Promise<StatsResponse> {
  const controls = await getLocalControls(engagementId)
  const byFamily = new Map<string, DomainStats>()
  const sprsMaxScore = 110
  let pointsDeducted = 0

  for (const c of controls) {
    const d = byFamily.get(c.familyCode) ?? emptyDomain(c.familyCode, c.familyName)
    d.total += 1
    switch (c.status) {
      case 'MET':
        d.met += 1
        break
      case 'NOT_MET':
        d.notMet += 1
        pointsDeducted += cmmcRequirementValues[c.requirementId]?.value ?? 0
        break
      case 'NOT_APPLICABLE':
        d.notApplicable += 1
        break
      default:
        d.notAssessed += 1
    }
    byFamily.set(c.familyCode, d)
  }

  const domains = [...byFamily.values()].sort((a, b) => a.familyCode.localeCompare(b.familyCode))
  const totals = domains.reduce<DomainStats>((t, d) => ({
    familyCode: 'ALL',
    familyName: 'All Domains',
    total: t.total + d.total,
    met: t.met + d.met,
    notMet: t.notMet + d.notMet,
    notApplicable: t.notApplicable + d.notApplicable,
    notAssessed: t.notAssessed + d.notAssessed,
  }), emptyDomain('ALL', 'All Domains'))

  return { domains, totals, sprsScore: sprsMaxScore - pointsDeducted, sprsMaxScore, pointsDeducted }
}
