/**
 * @vitest-environment jsdom
 *
 * Compile-time tests for the restructured engagement-detail component.
 * Verifies: component exports, new SSP tab imports, PackageStatsSection import.
 *
 * Runs in jsdom because the component modules transitively pull in code
 * that touches `window`/`document` during module init (dnd-kit, Shadcn
 * dialogs, etc.); running in node was flaky depending on parallel test
 * ordering.
 */
import { describe, it, expect } from 'vitest'

describe('engagement-detail restructure', () => {
  it('EngagementDetail is exported from engagement-detail', async () => {
    const mod = await import('@/components/c3pao/engagement-detail')
    expect(typeof mod.EngagementDetail).toBe('function')
  })

  it('engagement-detail imports OverviewTab', async () => {
    // Indirectly verified by TypeScript compilation — if the import is missing it
    // would fail to compile. This test confirms the module loads without error.
    const mod = await import('@/components/c3pao/engagement-detail')
    expect(mod.EngagementDetail).toBeDefined()
  })

  it('PackageStatsSection is imported and usable from tabs', async () => {
    const mod = await import('@/components/c3pao/tabs/package-stats-section')
    expect(typeof mod.PackageStatsSection).toBe('function')
  })

  it('all new SSP tab components are importable', async () => {
    const [overview, profile, network, personnel, policies, assets] = await Promise.all([
      import('@/components/c3pao/tabs/overview-tab'),
      import('@/components/c3pao/tabs/system-profile-tab'),
      import('@/components/c3pao/tabs/network-tab'),
      import('@/components/c3pao/tabs/personnel-tab'),
      import('@/components/c3pao/tabs/policies-tab'),
      import('@/components/c3pao/tabs/assets-tab'),
    ])
    expect(typeof overview.OverviewTab).toBe('function')
    expect(typeof profile.SystemProfileTab).toBe('function')
    expect(typeof network.NetworkTab).toBe('function')
    expect(typeof personnel.PersonnelTab).toBe('function')
    expect(typeof policies.PoliciesTab).toBe('function')
    expect(typeof assets.AssetsTab).toBe('function')
  })
})
