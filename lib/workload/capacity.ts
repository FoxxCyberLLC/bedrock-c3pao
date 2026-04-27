/**
 * Capacity-band derivation for the workload dashboard.
 *
 * Pure helper — no side effects, no I/O. Used to color-code the per-assessor
 * row chip and to surface an at-a-glance health summary.
 *
 * Boundaries:
 *   <= 1     → light       ("Has bandwidth for new work")
 *   2 .. 3   → healthy     ("Right-sized portfolio")
 *   4 .. 5   → stretched   ("Approaching capacity")
 *   >= 6     → overloaded  ("Consider reassignment")
 */

export type CapacityBand = 'light' | 'healthy' | 'stretched' | 'overloaded'

export interface CapacityInfo {
  band: CapacityBand
  label: string
  description: string
}

export function deriveCapacity(activeEngagements: number): CapacityInfo {
  if (activeEngagements <= 1) {
    return {
      band: 'light',
      label: 'Light',
      description: 'Has bandwidth for new work',
    }
  }
  if (activeEngagements <= 3) {
    return {
      band: 'healthy',
      label: 'Healthy',
      description: 'Right-sized portfolio',
    }
  }
  if (activeEngagements <= 5) {
    return {
      band: 'stretched',
      label: 'Stretched',
      description: 'Approaching capacity',
    }
  }
  return {
    band: 'overloaded',
    label: 'Overloaded',
    description: 'Consider reassignment',
  }
}
