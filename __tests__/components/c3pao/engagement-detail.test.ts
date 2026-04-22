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

// The engagement-detail module graph is large (dnd-kit, shadcn dialogs, many tabs
// and their deps) and cold-cache imports under parallel test pressure routinely
// exceed the 5s default. These are compile-only smoke tests — correctness is
// verified by tsc and other tests — so a generous timeout is appropriate.
const COLD_IMPORT_TIMEOUT_MS = 20_000

describe('engagement-detail restructure', () => {
  it('EngagementDetail is exported from engagement-detail', async () => {
    const mod = await import('@/components/c3pao/engagement-detail')
    expect(typeof mod.EngagementDetail).toBe('function')
  }, COLD_IMPORT_TIMEOUT_MS)

  it('engagement-detail imports OverviewTab', async () => {
    // Indirectly verified by TypeScript compilation — if the import is missing it
    // would fail to compile. This test confirms the module loads without error.
    const mod = await import('@/components/c3pao/engagement-detail')
    expect(mod.EngagementDetail).toBeDefined()
  }, COLD_IMPORT_TIMEOUT_MS)

  it('PackageStatsSection is imported and usable from tabs', async () => {
    const mod = await import('@/components/c3pao/tabs/package-stats-section')
    expect(typeof mod.PackageStatsSection).toBe('function')
  }, COLD_IMPORT_TIMEOUT_MS)

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
  }, COLD_IMPORT_TIMEOUT_MS)
})
