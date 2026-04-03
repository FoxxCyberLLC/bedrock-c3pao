/**
 * Compile-time test for the PackageStatsSection component.
 */
import { describe, it, expect } from 'vitest'

describe('PackageStatsSection component exports', () => {
  it('PackageStatsSection is exported from package-stats-section', async () => {
    const mod = await import('@/components/c3pao/tabs/package-stats-section')
    expect(typeof mod.PackageStatsSection).toBe('function')
  })
})
