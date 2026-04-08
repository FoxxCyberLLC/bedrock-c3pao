/**
 * Certificate tracker classification helpers (Task 11b).
 *
 * Pure functions — buckets PortfolioListItem rows into Final /
 * Conditional / Expired lists and computes days-until-expiry for the
 * /certificates page and the portfolio dashboard KPIs.
 */

import type { PortfolioListItem } from '@/lib/api-client'

export interface CertificateBuckets {
  final: PortfolioListItem[]
  conditional: PortfolioListItem[]
  expired: PortfolioListItem[]
}

/** Days between `now` and the given ISO date. Negative if past. Null if invalid. */
export function daysUntil(
  dateStr: string | null,
  now: Date = new Date(),
): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((d.getTime() - now.getTime()) / msPerDay)
}

/**
 * Classify engagements into cert buckets.
 *
 *   final       — active Final Level 2 certs (expiry > now)
 *   conditional — active Conditional Level 2 certs (poamCloseoutDue > now)
 *   expired     — past-expiry Final, past-closeout Conditional,
 *                 and all NO_CMMC_STATUS engagements
 *
 * Engagements with no certStatus at all are excluded from every bucket.
 */
export function classifyCertificates(
  items: readonly PortfolioListItem[],
  now: Date = new Date(),
): CertificateBuckets {
  const buckets: CertificateBuckets = {
    final: [],
    conditional: [],
    expired: [],
  }

  for (const item of items) {
    if (!item.certStatus) continue

    if (item.certStatus === 'NO_CMMC_STATUS') {
      buckets.expired.push(item)
      continue
    }

    if (item.certStatus === 'FINAL_LEVEL_2') {
      const days = daysUntil(item.certExpiresAt, now)
      if (days !== null && days < 0) {
        buckets.expired.push(item)
      } else {
        buckets.final.push(item)
      }
      continue
    }

    if (item.certStatus === 'CONDITIONAL_LEVEL_2') {
      const days = daysUntil(item.poamCloseoutDue ?? item.certExpiresAt, now)
      if (days !== null && days < 0) {
        buckets.expired.push(item)
      } else {
        buckets.conditional.push(item)
      }
      continue
    }
  }

  // Sort Final by certExpiresAt ascending (soonest-to-expire first).
  buckets.final.sort((a, b) => {
    const ad = a.certExpiresAt ?? '9999'
    const bd = b.certExpiresAt ?? '9999'
    return ad.localeCompare(bd)
  })

  // Sort Conditional by poamCloseoutDue ascending.
  buckets.conditional.sort((a, b) => {
    const ad = a.poamCloseoutDue ?? a.certExpiresAt ?? '9999'
    const bd = b.poamCloseoutDue ?? b.certExpiresAt ?? '9999'
    return ad.localeCompare(bd)
  })

  return buckets
}
