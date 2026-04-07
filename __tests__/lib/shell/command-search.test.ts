/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest'
import {
  buildEngagementCommands,
  buildTeamCommands,
  getPageCommands,
  readRecentEngagements,
  rememberRecentEngagement,
  MAX_RECENT_ENGAGEMENTS,
} from '@/lib/shell/command-search'

describe('command-search', () => {
  describe('buildEngagementCommands', () => {
    it('maps engagements to command items with keywords', () => {
      const items = buildEngagementCommands([
        {
          id: 'e1',
          packageName: 'Acme SSP',
          organizationName: 'Acme Defense',
          status: 'IN_PROGRESS',
        },
      ])
      expect(items).toHaveLength(1)
      const item = items[0]
      expect(item.id).toBe('engagement:e1')
      expect(item.title).toBe('Acme SSP')
      expect(item.subtitle).toBe('Acme Defense')
      expect(item.href).toBe('/engagements/e1')
      expect(item.group).toBe('Engagements')
      // Keywords include both package and org so cmdk matches either
      expect(item.keywords.join(' ').toLowerCase()).toContain('acme')
      expect(item.keywords.join(' ').toLowerCase()).toContain('defense')
    })

    it('skips engagements with missing required fields', () => {
      const items = buildEngagementCommands([
        { id: '', packageName: 'x', organizationName: 'y', status: 'x' },
        { id: 'ok', packageName: 'ok', organizationName: 'ok', status: 'x' },
      ])
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('engagement:ok')
    })

    it('handles an empty list', () => {
      expect(buildEngagementCommands([])).toEqual([])
    })
  })

  describe('buildTeamCommands', () => {
    it('maps team members to command items', () => {
      const items = buildTeamCommands([
        { id: 't1', name: 'Jane Doe', email: 'jane@example.com' },
      ])
      expect(items).toHaveLength(1)
      const item = items[0]
      expect(item.id).toBe('team:t1')
      expect(item.title).toBe('Jane Doe')
      expect(item.subtitle).toBe('jane@example.com')
      expect(item.href).toBe('/team')
      expect(item.group).toBe('Team')
      expect(item.keywords).toContain('Jane Doe')
      expect(item.keywords).toContain('jane@example.com')
    })
  })

  describe('getPageCommands', () => {
    it('returns the navigable pages as command items', () => {
      const pages = getPageCommands(true)
      const hrefs = pages.map((p) => p.href)
      expect(hrefs).toContain('/')
      expect(hrefs).toContain('/engagements')
      expect(hrefs).toContain('/board')
      expect(hrefs).toContain('/calendar')
      expect(hrefs).toContain('/workload')
      expect(hrefs).toContain('/team')
      // Lead-only COI is present for a lead
      expect(hrefs).toContain('/coi')
    })

    it('hides lead-only pages for a non-lead user', () => {
      const pages = getPageCommands(false)
      const hrefs = pages.map((p) => p.href)
      expect(hrefs).not.toContain('/coi')
    })

    it('all page commands are grouped under "Pages"', () => {
      const pages = getPageCommands(true)
      for (const p of pages) {
        expect(p.group).toBe('Pages')
      }
    })
  })

  describe('recent engagements localStorage', () => {
    beforeEach(() => {
      // reset localStorage between sub-cases
      localStorage.clear()
    })

    it('readRecentEngagements returns an empty array when the key is unset', () => {
      expect(readRecentEngagements()).toEqual([])
    })

    it('rememberRecentEngagement writes and readRecentEngagements reads back', () => {
      rememberRecentEngagement({
        id: 'e1',
        packageName: 'Acme SSP',
        organizationName: 'Acme Defense',
        status: 'IN_PROGRESS',
      })
      const recent = readRecentEngagements()
      expect(recent).toHaveLength(1)
      expect(recent[0].id).toBe('e1')
    })

    it('rememberRecentEngagement deduplicates by id (most recent first)', () => {
      rememberRecentEngagement({ id: 'a', packageName: 'A', organizationName: 'A', status: 's' })
      rememberRecentEngagement({ id: 'b', packageName: 'B', organizationName: 'B', status: 's' })
      rememberRecentEngagement({ id: 'a', packageName: 'A', organizationName: 'A', status: 's' })
      const recent = readRecentEngagements()
      expect(recent.map((r) => r.id)).toEqual(['a', 'b'])
    })

    it(`caps at ${MAX_RECENT_ENGAGEMENTS} items, evicting the oldest`, () => {
      for (let i = 0; i < MAX_RECENT_ENGAGEMENTS + 3; i++) {
        rememberRecentEngagement({
          id: `e${i}`,
          packageName: `P${i}`,
          organizationName: `O${i}`,
          status: 's',
        })
      }
      const recent = readRecentEngagements()
      expect(recent).toHaveLength(MAX_RECENT_ENGAGEMENTS)
      // Most recent is first, oldest (e0, e1, e2) are evicted
      expect(recent[0].id).toBe(`e${MAX_RECENT_ENGAGEMENTS + 2}`)
      expect(recent.find((r) => r.id === 'e0')).toBeUndefined()
    })

    it('tolerates corrupted JSON in localStorage by returning []', () => {
      localStorage.setItem('c3pao-recent-engagements', '{not valid json')
      expect(readRecentEngagements()).toEqual([])
    })
  })
})
