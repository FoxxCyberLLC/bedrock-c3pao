/**
 * Compile-time test for the AssetsTab component.
 * Verifies the module exports the expected named export.
 */
import { describe, it, expect } from 'vitest'

describe('AssetsTab component exports', () => {
  it('AssetsTab is exported from assets-tab', async () => {
    const mod = await import('@/components/c3pao/tabs/assets-tab')
    expect(typeof mod.AssetsTab).toBe('function')
  })
})
