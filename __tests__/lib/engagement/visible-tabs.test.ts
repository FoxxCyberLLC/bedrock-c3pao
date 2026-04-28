import { describe, it, expect } from 'vitest'
import { getVisibleTabs, isTabVisible } from '@/lib/engagement/visible-tabs'

describe('getVisibleTabs', () => {
  it('OSC engagements show all 3 sections with the full Package tab list', () => {
    const v = getVisibleTabs('osc')
    expect(v.sections).toEqual(['package', 'assessment', 'engagement'])
    expect(v.tabs.package).toBeDefined()
    expect(v.tabs.package).toHaveLength(10)
    expect(v.defaultSection).toBe('package')
    expect(v.defaultTab).toBe('overview')
  })

  it('outside engagements hide the Package section entirely', () => {
    const v = getVisibleTabs('outside_osc')
    expect(v.sections).toEqual(['assessment', 'engagement'])
    expect(v.tabs.package).toBeUndefined()
    expect(v.defaultSection).toBe('assessment')
    expect(v.defaultTab).toBe('controls')
  })

  it('outside engagements add an Evidence tab to the Assessment section', () => {
    const v = getVisibleTabs('outside_osc')
    expect(v.tabs.assessment).toContain('evidence')
    expect(v.tabs.assessment).toContain('controls')
  })

  it('OSC engagements do NOT have an Assessment > Evidence tab (Evidence lives under Package)', () => {
    const v = getVisibleTabs('osc')
    expect(v.tabs.assessment).not.toContain('evidence')
    expect(v.tabs.package).toContain('evidence')
  })

  it('Engagement section is identical across kinds', () => {
    const osc = getVisibleTabs('osc')
    const outside = getVisibleTabs('outside_osc')
    expect(osc.tabs.engagement).toEqual(outside.tabs.engagement)
  })
})

describe('isTabVisible', () => {
  it('hides POA&Ms / SSP / STIGs tabs for outside engagements', () => {
    expect(isTabVisible('outside_osc', 'poams')).toBe(false)
    expect(isTabVisible('outside_osc', 'full-ssp')).toBe(false)
    expect(isTabVisible('outside_osc', 'stigs')).toBe(false)
    expect(isTabVisible('outside_osc', 'system-profile')).toBe(false)
  })

  it('keeps POA&Ms / SSP / STIGs tabs for OSC engagements', () => {
    expect(isTabVisible('osc', 'poams')).toBe(true)
    expect(isTabVisible('osc', 'full-ssp')).toBe(true)
    expect(isTabVisible('osc', 'stigs')).toBe(true)
  })

  it('keeps controls + progress + review on both kinds', () => {
    for (const kind of ['osc', 'outside_osc'] as const) {
      expect(isTabVisible(kind, 'controls')).toBe(true)
      expect(isTabVisible(kind, 'progress')).toBe(true)
      expect(isTabVisible(kind, 'review')).toBe(true)
    }
  })
})
