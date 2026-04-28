/**
 * Local extension type for the engagements list table.
 *
 * The Go API exposes `findingsCount` on `EngagementSummary` (from the
 * /assessments endpoint) but not on `PortfolioListItem` (from the
 * /portfolio-list endpoint). The /engagements page server component fetches
 * both in parallel and merges them by id, producing this row shape.
 *
 * Sort, grouping, and saved-view helpers don't read `findingsCount` so they
 * still accept the narrower `PortfolioListItem`. `PortfolioRow extends
 * PortfolioListItem` keeps it assignable everywhere.
 */

import type { PortfolioListItem } from '@/lib/api-client'
import type { EngagementKind } from '@/lib/outside-engagement-types'

export interface PortfolioRow extends PortfolioListItem {
  findingsCount: number | null
  /** Discriminator: OSC rows come from the Go API; outside rows from local Postgres. */
  kind: EngagementKind
}
