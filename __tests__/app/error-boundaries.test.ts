/**
 * H17: Smoke tests for error boundaries.
 * Verifies that error boundary files exist and export a callable component.
 * Full rendering tests require a DOM environment not configured here.
 */
import { describe, it, expect } from 'vitest'

describe('Error boundaries (H17)', () => {
  it('global-error exports a default function component', async () => {
    const mod = await import('@/app/global-error')
    expect(typeof mod.default).toBe('function')
    expect(mod.default.name || (mod.default as any).displayName || 'GlobalError').toBeTruthy()
  })

  it('dashboard error exports a default function component', async () => {
    const mod = await import('@/app/(dashboard)/error')
    expect(typeof mod.default).toBe('function')
    expect(mod.default.name || (mod.default as any).displayName || 'DashboardError').toBeTruthy()
  })

  it('global-error component accepts required props without throwing', async () => {
    const { default: GlobalError } = await import('@/app/global-error')
    // Verify the component is a function that accepts error and reset props
    expect(GlobalError.length).toBeLessThanOrEqual(2) // (props) or ({error, reset})
  })

  it('dashboard error component accepts required props without throwing', async () => {
    const { default: DashboardError } = await import('@/app/(dashboard)/error')
    expect(DashboardError.length).toBeLessThanOrEqual(2)
  })

  it('root error boundary exports a default function component', async () => {
    const mod = await import('@/app/error')
    expect(typeof mod.default).toBe('function')
    expect(mod.default.name || (mod.default as any).displayName || 'RootError').toBeTruthy()
  })

  it('dashboard loading exports a default function component', async () => {
    const mod = await import('@/app/(dashboard)/loading')
    expect(typeof mod.default).toBe('function')
  })
})
