/**
 * Activity freshness classifier for the engagements table.
 *
 * Replaces the old "Progress" column (X / Y · pct%) with a stale-detector
 * pip. The percentage was misleading on real CMMC L2 engagements (~320
 * objectives) — it crept up slowly and didn't surface which rows were
 * actually being worked. "When was this last touched" is the actionable
 * signal.
 *
 * Pure function — returns a tone bucket. Tailwind classes live in the row
 * component so this module stays styling-agnostic and unit-testable.
 *
 * Day boundaries (deliberate):
 *   - fresh:   ≤ 3 days
 *   - aging:   4 – 14 days
 *   - stale:   > 14 days
 *   - unknown: null / invalid timestamp
 */

export type FreshnessTone = 'fresh' | 'aging' | 'stale' | 'unknown'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function getFreshnessTone(
  updatedAtIso: string | null,
  now: Date = new Date(),
): FreshnessTone {
  if (!updatedAtIso) return 'unknown'
  const t = new Date(updatedAtIso).getTime()
  if (!Number.isFinite(t)) return 'unknown'
  const days = (now.getTime() - t) / MS_PER_DAY
  if (days <= 3) return 'fresh'
  if (days <= 14) return 'aging'
  return 'stale'
}
