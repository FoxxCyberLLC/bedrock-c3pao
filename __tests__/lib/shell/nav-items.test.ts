import { describe, expect, it } from 'vitest'
import {
  ALL_NAV_ITEMS,
  getVisibleNavItems,
  isActiveRoute,
} from '@/lib/shell/nav-items'

describe('nav-items', () => {
  describe('ALL_NAV_ITEMS', () => {
    it('exposes the full set of dashboard routes in display order', () => {
      const hrefs = ALL_NAV_ITEMS.map((item) => item.href)
      expect(hrefs).toEqual([
        '/',
        '/inbox',
        '/engagements',
        '/board',
        '/calendar',
        '/workload',
        '/team',
        '/certificates',
        '/qa',
        '/coi',
        '/connection',
        '/profile',
      ])
    })

    it('marks exactly one item as leadOnly (COI register)', () => {
      const leadOnly = ALL_NAV_ITEMS.filter((item) => item.leadOnly)
      expect(leadOnly).toHaveLength(1)
      expect(leadOnly[0].href).toBe('/coi')
    })

    it('every nav item has a label, href, and icon name', () => {
      for (const item of ALL_NAV_ITEMS) {
        expect(item.label).toBeTypeOf('string')
        expect(item.label.length).toBeGreaterThan(0)
        expect(item.href.startsWith('/')).toBe(true)
        expect(item.iconName).toBeTypeOf('string')
        expect(item.iconName.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getVisibleNavItems', () => {
    it('returns all items for a lead assessor', () => {
      const visible = getVisibleNavItems(true)
      expect(visible).toHaveLength(ALL_NAV_ITEMS.length)
    })

    it('filters out leadOnly items for a non-lead assessor', () => {
      const visible = getVisibleNavItems(false)
      expect(visible).toHaveLength(ALL_NAV_ITEMS.length - 1)
      expect(visible.find((item) => item.href === '/coi')).toBeUndefined()
    })

    it('preserves display order after filtering', () => {
      const visible = getVisibleNavItems(false)
      const hrefs = visible.map((item) => item.href)
      expect(hrefs).toEqual([
        '/',
        '/inbox',
        '/engagements',
        '/board',
        '/calendar',
        '/workload',
        '/team',
        '/certificates',
        '/qa',
        '/connection',
        '/profile',
      ])
    })
  })

  describe('isActiveRoute', () => {
    it('matches the dashboard home exactly', () => {
      expect(isActiveRoute('/', '/')).toBe(true)
      expect(isActiveRoute('/engagements', '/')).toBe(false)
    })

    it('matches a top-level route', () => {
      expect(isActiveRoute('/engagements', '/engagements')).toBe(true)
    })

    it('matches a nested route (engagement detail under /engagements)', () => {
      expect(isActiveRoute('/engagements/abc-123', '/engagements')).toBe(true)
    })

    it('does not confuse /team with /team-something-else', () => {
      // Home is a special case; other routes use a strict-prefix-plus-/ check
      expect(isActiveRoute('/team', '/team')).toBe(true)
      expect(isActiveRoute('/team/member/1', '/team')).toBe(true)
      // A sibling route starting with the same prefix must not match
      expect(isActiveRoute('/teams-old', '/team')).toBe(false)
    })

    it('handles null pathname gracefully', () => {
      expect(isActiveRoute(null, '/engagements')).toBe(false)
      expect(isActiveRoute(undefined, '/engagements')).toBe(false)
    })
  })
})
