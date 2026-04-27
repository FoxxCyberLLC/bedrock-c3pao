import { describe, it, expect } from 'vitest'
import { TAG_COLORS } from '@/lib/personal-views-types'

describe('personal-views-types', () => {
  describe('TAG_COLORS', () => {
    it('has exactly 6 entries', () => {
      expect(TAG_COLORS).toHaveLength(6)
    })

    it('has unique entries', () => {
      const seen = new Set(TAG_COLORS)
      expect(seen.size).toBe(TAG_COLORS.length)
    })

    it('contains the expected colors', () => {
      expect(TAG_COLORS).toEqual(['sky', 'violet', 'amber', 'emerald', 'rose', 'slate'])
    })
  })
})
