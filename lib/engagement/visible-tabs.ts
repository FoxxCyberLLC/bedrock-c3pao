/**
 * Pure helper that decides which sections + tabs render on the engagement
 * detail page based on the engagement kind. Keeps the kind branching at
 * the layout boundary so deep child components never need to check kind.
 */

import type { EngagementKind } from '@/lib/outside-engagement-types'

export type SectionId = 'package' | 'assessment' | 'engagement'

export type PackageTabId =
  | 'overview'
  | 'system-profile'
  | 'network'
  | 'personnel'
  | 'policies'
  | 'assets'
  | 'evidence'
  | 'stigs'
  | 'poams'
  | 'full-ssp'

export type AssessmentTabId =
  | 'planning'
  | 'controls'
  | 'progress'
  | 'review'
  | 'evidence'

export type EngagementTabId = 'engagement-overview' | 'schedule-logistics'

export type TabId = PackageTabId | AssessmentTabId | EngagementTabId

export interface VisibleTabs {
  sections: ReadonlyArray<SectionId>
  tabs: {
    package?: ReadonlyArray<PackageTabId>
    assessment: ReadonlyArray<AssessmentTabId>
    engagement: ReadonlyArray<EngagementTabId>
  }
  defaultSection: SectionId
  defaultTab: TabId
}

const PACKAGE_TABS: ReadonlyArray<PackageTabId> = [
  'overview',
  'system-profile',
  'network',
  'personnel',
  'policies',
  'assets',
  'evidence',
  'stigs',
  'poams',
  'full-ssp',
]

const ASSESSMENT_TABS_OSC: ReadonlyArray<AssessmentTabId> = [
  'planning',
  'controls',
  'progress',
  'review',
]

const ASSESSMENT_TABS_OUTSIDE: ReadonlyArray<AssessmentTabId> = [
  'planning',
  'controls',
  'progress',
  'review',
  'evidence',
]

const ENGAGEMENT_TABS: ReadonlyArray<EngagementTabId> = [
  'engagement-overview',
  'schedule-logistics',
]

export function getVisibleTabs(kind: EngagementKind): VisibleTabs {
  if (kind === 'outside_osc') {
    return {
      sections: ['assessment', 'engagement'],
      tabs: {
        assessment: ASSESSMENT_TABS_OUTSIDE,
        engagement: ENGAGEMENT_TABS,
      },
      defaultSection: 'assessment',
      defaultTab: 'controls',
    }
  }
  return {
    sections: ['package', 'assessment', 'engagement'],
    tabs: {
      package: PACKAGE_TABS,
      assessment: ASSESSMENT_TABS_OSC,
      engagement: ENGAGEMENT_TABS,
    },
    defaultSection: 'package',
    defaultTab: 'overview',
  }
}

/** True when the given tab is rendered for the given kind. */
export function isTabVisible(kind: EngagementKind, tab: TabId): boolean {
  const v = getVisibleTabs(kind)
  return (
    (v.tabs.package?.includes(tab as PackageTabId) ?? false) ||
    v.tabs.assessment.includes(tab as AssessmentTabId) ||
    v.tabs.engagement.includes(tab as EngagementTabId)
  )
}
