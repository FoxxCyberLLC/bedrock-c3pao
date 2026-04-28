/**
 * Type definitions for outside-OSC engagements (local-only c3pao engagements
 * not represented as ATO packages in bedrock-cmmc).
 */

import type { PortfolioListItem } from '@/lib/api-client'

/** Discriminator between Go-API-backed OSC engagements and local-only outside engagements. */
export type EngagementKind = 'osc' | 'outside_osc'

/** Lifecycle status of an outside engagement. */
export type OutsideEngagementStatus =
  | 'PLANNING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

/** CMMC level being assessed. */
export type OutsideEngagementTargetLevel = 'L1' | 'L2' | 'L3'

/** Outside-engagement row as exposed to the application layer (camelCase). */
export interface OutsideEngagement {
  id: string
  kind: 'outside_osc'
  name: string
  clientName: string
  clientPocName: string
  clientPocEmail: string
  scope: string | null
  targetLevel: OutsideEngagementTargetLevel
  status: OutsideEngagementStatus
  leadAssessorId: string
  leadAssessorName: string
  scheduledStartDate: string
  scheduledEndDate: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** Same shape as PortfolioListItem with a kind discriminator for the merged engagements list. */
export interface OutsideEngagementListItem extends PortfolioListItem {
  kind: 'outside_osc'
}

/** Same shape as PortfolioListItem with a kind discriminator for the merged engagements list. */
export interface OSCEngagementListItem extends PortfolioListItem {
  kind: 'osc'
}

/** Discriminated union of items in the merged engagements list. */
export type MergedEngagementListItem = OSCEngagementListItem | OutsideEngagementListItem

export function isOSCEngagement<T extends { kind: EngagementKind }>(
  item: T,
): item is T & { kind: 'osc' } {
  return item.kind === 'osc'
}

export function isOutsideEngagement<T extends { kind: EngagementKind }>(
  item: T,
): item is T & { kind: 'outside_osc' } {
  return item.kind === 'outside_osc'
}
