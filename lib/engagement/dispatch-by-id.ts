/**
 * Pure helper for dispatching engagement detail/sub-route fetches by id.
 *
 * Strategy: try the LOCAL outside-engagement lookup first. If it returns a row,
 * the URL is for an outside engagement. Otherwise treat it as an OSC engagement
 * (no Go-API call here — the caller decides what to do with the OSC kind).
 *
 * Defense-in-depth: even in the (vanishingly unlikely) UUID collision between
 * a Go API engagement ID and an outside UUID, the local lookup wins, so the
 * page never accidentally serves OSC data for a URL that the user thinks
 * points to their outside engagement.
 */

import { getOutsideEngagementById } from '@/lib/db-outside-engagement'
import type { OutsideEngagement } from '@/lib/outside-engagement-types'

export type DispatchResult =
  | { kind: 'outside_osc'; engagement: OutsideEngagement }
  | { kind: 'osc'; engagementId: string }

/**
 * Resolve the engagement source from an id. Local outside lookup is checked
 * first; absence is interpreted as 'osc' (caller must verify with the Go API).
 *
 * @param id The engagement id from the URL
 * @param resolver Injected for testing; production passes getOutsideEngagementById.
 */
export async function dispatchEngagementById(
  id: string,
  resolver: (id: string) => Promise<OutsideEngagement | null> = getOutsideEngagementById,
): Promise<DispatchResult> {
  try {
    const outside = await resolver(id)
    if (outside) return { kind: 'outside_osc', engagement: outside }
  } catch {
    // Local Postgres unreachable — fall through to OSC. Outside engagements
    // simply will not be discoverable until the DB is back.
  }
  return { kind: 'osc', engagementId: id }
}
