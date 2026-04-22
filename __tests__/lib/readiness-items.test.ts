import { describe, it, expect } from 'vitest'
import {
  orderedItemDefinitions,
  READINESS_ITEM_DEFINITIONS,
} from '@/lib/readiness-items'
import { READINESS_ITEM_KEYS } from '@/lib/readiness-types'

describe('readiness-items', () => {
  it('has exactly 8 items', () => {
    expect(orderedItemDefinitions()).toHaveLength(8)
  })

  it('every key in READINESS_ITEM_KEYS has a definition', () => {
    for (const k of READINESS_ITEM_KEYS) {
      expect(READINESS_ITEM_DEFINITIONS[k]).toBeDefined()
      expect(READINESS_ITEM_DEFINITIONS[k].title).toBeTruthy()
      expect(READINESS_ITEM_DEFINITIONS[k].defaultArtifactDescription).toBeTruthy()
      expect(READINESS_ITEM_DEFINITIONS[k].typicalWaiverReason).toBeTruthy()
    }
  })

  it('orders are unique and sequential 1-8', () => {
    const orders = orderedItemDefinitions().map((d) => d.order)
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('READINESS_ITEM_KEYS order matches definition order', () => {
    const keysFromOrdered = orderedItemDefinitions().map((d) => d.key)
    expect(keysFromOrdered).toEqual([...READINESS_ITEM_KEYS])
  })

  it('every definition key matches its own record key', () => {
    for (const k of READINESS_ITEM_KEYS) {
      expect(READINESS_ITEM_DEFINITIONS[k].key).toBe(k)
    }
  })
})
