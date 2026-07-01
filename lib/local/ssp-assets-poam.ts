/**
 * Local (air-gapped) SSP / assets / POA&M data layer — Task 15.
 *
 * All three are org-scoped context the OSC authored; they travel in the snapshot and are read
 * back from `imp_ssp` / `imp_asset` / `imp_poam` (scoped by the tagged `engagement_id`). The
 * imported JSONB rows mirror the `api-client` view shapes 1:1 (same Go source model), so these are
 * typed passthroughs — only the nested POA&M milestones are mapped explicitly. No network.
 */
import { query } from '@/lib/db'
import type { SSPView, AssetView, POAMView, MilestoneView } from '@/lib/api-client'

/** The single imported SSP for the engagement (null when none was included). */
export async function getLocalSSP(engagementId: string): Promise<SSPView | null> {
  const result = await query(
    `SELECT data FROM imp_ssp WHERE engagement_id = $1 ORDER BY imported_at DESC LIMIT 1`,
    [engagementId]
  )
  if (result.rows.length === 0) return null
  return (result.rows[0] as { data: Record<string, unknown> }).data as unknown as SSPView
}

/** Imported hardware/software asset inventory. */
export async function getLocalAssets(engagementId: string): Promise<AssetView[]> {
  const result = await query(
    `SELECT data FROM imp_asset WHERE engagement_id = $1 ORDER BY data->>'name' NULLS LAST`,
    [engagementId]
  )
  return result.rows.map((r) => (r as { data: Record<string, unknown> }).data as unknown as AssetView)
}

function mapMilestone(m: Record<string, unknown>): MilestoneView {
  return {
    description: String(m.description ?? ''),
    dueDate: String(m.dueDate ?? ''),
    completed: m.completed === true,
    completedDate: m.completedDate != null ? String(m.completedDate) : null,
  }
}

function mapPoam(data: Record<string, unknown>): POAMView {
  const milestones = Array.isArray(data.milestones)
    ? (data.milestones as Record<string, unknown>[]).map(mapMilestone)
    : []
  return { ...(data as unknown as POAMView), milestones }
}

/** Imported POA&Ms with their milestones. */
export async function getLocalPoams(engagementId: string): Promise<POAMView[]> {
  const result = await query(
    `SELECT data FROM imp_poam WHERE engagement_id = $1 ORDER BY data->>'createdAt' DESC NULLS LAST`,
    [engagementId]
  )
  return result.rows.map((r) => mapPoam((r as { data: Record<string, unknown> }).data))
}
