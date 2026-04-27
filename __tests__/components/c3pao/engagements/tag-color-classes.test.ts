/**
 * Verifies every TagColor has both `chip` and `dot` Tailwind class strings.
 * Catches accidental palette drift when colors are added or removed.
 */
import { describe, it, expect } from 'vitest'
import { TAG_COLORS } from '@/lib/personal-views-types'
import { TAG_COLOR_CLASSES } from '@/components/c3pao/engagements/tag-color-classes'

describe('TAG_COLOR_CLASSES', () => {
  it('has an entry for every TagColor', () => {
    for (const color of TAG_COLORS) {
      expect(TAG_COLOR_CLASSES[color]).toBeDefined()
    }
  })

  it('every entry has non-empty chip and dot strings', () => {
    for (const color of TAG_COLORS) {
      const entry = TAG_COLOR_CLASSES[color]
      expect(entry.chip).toMatch(/\S/)
      expect(entry.dot).toMatch(/\S/)
    }
  })

  it('every chip references both bg- and text- utilities', () => {
    for (const color of TAG_COLORS) {
      const { chip } = TAG_COLOR_CLASSES[color]
      expect(chip).toMatch(/\bbg-/)
      expect(chip).toMatch(/\btext-/)
      expect(chip).toMatch(/\bborder-/)
    }
  })

  it('every dot references a bg- utility', () => {
    for (const color of TAG_COLORS) {
      expect(TAG_COLOR_CLASSES[color].dot).toMatch(/\bbg-/)
    }
  })
})
