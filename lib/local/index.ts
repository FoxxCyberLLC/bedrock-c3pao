/**
 * Barrel for the offline local data layer. Domain modules (engagements, controls, objectives,
 * evidence, …) are added in Tasks 11-20 and re-exported here so server actions import from one
 * place. For now it exposes the offline-mode utilities.
 */
export { isOffline, assertOnline, OfflineModeError } from '@/lib/mode'
export { getLocalEngagementSummaries, getLocalEngagementDetail } from './engagements'
