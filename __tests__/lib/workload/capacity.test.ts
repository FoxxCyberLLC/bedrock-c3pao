import { describe, it, expect } from 'vitest'
import { deriveCapacity } from '@/lib/workload/capacity'

describe('deriveCapacity', () => {
  it('returns light for 0 active engagements', () => {
    const result = deriveCapacity(0)
    expect(result.band).toBe('light')
    expect(result.label).toBe('Light')
    expect(result.description).toBe('Has bandwidth for new work')
  })

  it('returns light for 1 active engagement', () => {
    const result = deriveCapacity(1)
    expect(result.band).toBe('light')
  })

  it('returns healthy for 2 active engagements', () => {
    const result = deriveCapacity(2)
    expect(result.band).toBe('healthy')
    expect(result.label).toBe('Healthy')
    expect(result.description).toBe('Right-sized portfolio')
  })

  it('returns healthy for 3 active engagements', () => {
    const result = deriveCapacity(3)
    expect(result.band).toBe('healthy')
  })

  it('returns stretched for 4 active engagements', () => {
    const result = deriveCapacity(4)
    expect(result.band).toBe('stretched')
    expect(result.label).toBe('Stretched')
    expect(result.description).toBe('Approaching capacity')
  })

  it('returns stretched for 5 active engagements', () => {
    const result = deriveCapacity(5)
    expect(result.band).toBe('stretched')
  })

  it('returns overloaded for 6 active engagements', () => {
    const result = deriveCapacity(6)
    expect(result.band).toBe('overloaded')
    expect(result.label).toBe('Overloaded')
    expect(result.description).toBe('Consider reassignment')
  })

  it('returns overloaded for 10 active engagements', () => {
    const result = deriveCapacity(10)
    expect(result.band).toBe('overloaded')
  })
})
