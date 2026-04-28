import { describe, it, expect } from 'vitest'
import {
  fromSavedViewFilter,
  toSavedViewFilter,
} from '@/lib/engagements-list/personal-filters'
import type { SavedViewFilter } from '@/lib/personal-views-types'

describe('saved-view kindFilter backward compatibility', () => {
  it('treats a saved view created BEFORE kindFilter existed as kindFilter="all"', () => {
    const legacy: SavedViewFilter = {
      phase: 'ASSESS',
      mineOnly: true,
      atRiskOnly: false,
      tags: ['high-risk'],
    }
    const state = fromSavedViewFilter(legacy)
    expect(state.kindFilter).toBe('all')
  })

  it('preserves kindFilter when round-tripping through saved-view shape', () => {
    const state = fromSavedViewFilter({})
    state.kindFilter = 'outside'
    state.mineOnly = true
    const persisted = toSavedViewFilter(state)
    expect(persisted.kindFilter).toBe('outside')
    const restored = fromSavedViewFilter(persisted)
    expect(restored.kindFilter).toBe('outside')
    expect(restored.mineOnly).toBe(true)
  })

  it('does not persist kindFilter when value is "all" (keeps JSONB lean)', () => {
    const state = fromSavedViewFilter({})
    state.kindFilter = 'all'
    const persisted = toSavedViewFilter(state)
    expect(persisted.kindFilter).toBeUndefined()
  })

  it('persists "osc" or "outside" but not "all"', () => {
    const baseState = fromSavedViewFilter({})
    expect(toSavedViewFilter({ ...baseState, kindFilter: 'osc' }).kindFilter).toBe('osc')
    expect(toSavedViewFilter({ ...baseState, kindFilter: 'outside' }).kindFilter).toBe(
      'outside',
    )
    expect(toSavedViewFilter({ ...baseState, kindFilter: 'all' }).kindFilter).toBeUndefined()
  })
})
