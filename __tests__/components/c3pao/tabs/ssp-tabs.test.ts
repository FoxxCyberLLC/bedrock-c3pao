/**
 * Compile-time tests for SSP tab components.
 * Verifies each component module exports the expected named export.
 * Environment: node (no DOM rendering) — uses TypeScript for type safety.
 */
import { describe, it, expect } from 'vitest'

describe('SSP tab component exports', () => {
  it('ssp-helpers exports required helpers', async () => {
    const mod = await import('@/components/c3pao/tabs/ssp-helpers')
    expect(typeof mod.ReadOnlyField).toBe('function')
    expect(typeof mod.ReadOnlyTextArea).toBe('function')
    expect(typeof mod.ContactCard).toBe('function')
    expect(typeof mod.DiagramDisplay).toBe('function')
    expect(typeof mod.ReadOnlyBanner).toBe('function')
  })

  it('OverviewTab is exported from overview-tab', async () => {
    const mod = await import('@/components/c3pao/tabs/overview-tab')
    expect(typeof mod.OverviewTab).toBe('function')
  })

  it('SystemProfileTab is exported from system-profile-tab', async () => {
    const mod = await import('@/components/c3pao/tabs/system-profile-tab')
    expect(typeof mod.SystemProfileTab).toBe('function')
  })

  it('NetworkTab is exported from network-tab', async () => {
    const mod = await import('@/components/c3pao/tabs/network-tab')
    expect(typeof mod.NetworkTab).toBe('function')
  })

  it('PersonnelTab is exported from personnel-tab', async () => {
    const mod = await import('@/components/c3pao/tabs/personnel-tab')
    expect(typeof mod.PersonnelTab).toBe('function')
  })

  it('PoliciesTab is exported from policies-tab', async () => {
    const mod = await import('@/components/c3pao/tabs/policies-tab')
    expect(typeof mod.PoliciesTab).toBe('function')
  })
})
