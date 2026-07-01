/**
 * Local (air-gapped) External Service Providers — Task 20.
 *
 * ESPs travel in the OSC snapshot (imp_external_service_provider), with their per-requirement
 * mappings in imp_esp_requirement_mapping. Read back scoped by the tagged engagement_id. The
 * imported JSONB mirrors the api-client shapes, so these are typed passthroughs. No network.
 */
import { query } from '@/lib/db'
import type { ESPView, ESPDetailView, ESPRequirementMappingView } from '@/lib/api-client'

/** All ESPs attached to the engagement's package. */
export async function getLocalESPsForEngagement(engagementId: string): Promise<ESPView[]> {
  const result = await query(
    `SELECT data FROM imp_external_service_provider WHERE engagement_id = $1 ORDER BY data->>'providerName'`,
    [engagementId]
  )
  return result.rows.map((r) => (r as { data: Record<string, unknown> }).data as unknown as ESPView)
}

/** One ESP plus its per-requirement mappings. */
export async function getLocalESPDetailForEngagement(
  engagementId: string,
  espId: string
): Promise<ESPDetailView | null> {
  const espRes = await query(
    `SELECT data FROM imp_external_service_provider WHERE id = $1 AND engagement_id = $2`,
    [espId, engagementId]
  )
  if (espRes.rows.length === 0) return null
  const esp = (espRes.rows[0] as { data: Record<string, unknown> }).data as unknown as ESPDetailView

  const mapRes = await query(
    `SELECT data FROM imp_esp_requirement_mapping
      WHERE engagement_id = $1 AND data->>'espId' = $2`,
    [engagementId, espId]
  )
  const requirementMappings = mapRes.rows.map(
    (r) => (r as { data: Record<string, unknown> }).data as unknown as ESPRequirementMappingView
  )
  return { ...esp, requirementMappings }
}
