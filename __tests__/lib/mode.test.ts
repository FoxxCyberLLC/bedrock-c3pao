import { describe, it, expect, afterEach } from 'vitest'
import { isOffline, assertOnline, OfflineModeError } from '@/lib/mode'

const original = process.env.OFFLINE
afterEach(() => {
  if (original === undefined) delete process.env.OFFLINE
  else process.env.OFFLINE = original
})

describe('isOffline', () => {
  it('is true only when OFFLINE is exactly "true"', () => {
    expect(isOffline({ OFFLINE: 'true' })).toBe(true)
    expect(isOffline({ OFFLINE: 'false' })).toBe(false)
    expect(isOffline({ OFFLINE: '1' })).toBe(false)
    expect(isOffline({})).toBe(false)
  })
})

describe('assertOnline', () => {
  it('throws OfflineModeError when offline', () => {
    process.env.OFFLINE = 'true'
    expect(() => assertOnline('/api/c3pao/assessments')).toThrow(OfflineModeError)
  })

  it('is a no-op when online', () => {
    delete process.env.OFFLINE
    expect(() => assertOnline('/api/c3pao/assessments')).not.toThrow()
  })
})
