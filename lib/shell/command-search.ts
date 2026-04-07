/**
 * Command palette search utilities.
 *
 * Pure functions that build command-menu item lists from raw data
 * (engagements, team members, pages). Isolated from React so they can be
 * unit-tested in the node vitest environment and shared between the command
 * palette UI and future search surfaces.
 */

import { ALL_NAV_ITEMS, getVisibleNavItems } from './nav-items'

/** Command palette item displayed in cmdk. */
export interface CommandItem {
  /** Stable id used as cmdk value. Globally unique across groups. */
  id: string
  /** Primary display text (bold). */
  title: string
  /** Secondary display text (muted). */
  subtitle: string
  /** Target route to navigate to on selection. */
  href: string
  /** Display group ("Engagements", "Team", "Pages", "Recent"). */
  group: 'Engagements' | 'Team' | 'Pages' | 'Recent'
  /** Additional search tokens surfaced to cmdk's built-in fuzzy matcher. */
  keywords: string[]
  /** Icon identifier (Lucide name), optional. */
  iconName?: string
}

/** Minimal shape the command palette needs from an engagement. */
export interface EngagementRef {
  id: string
  packageName: string
  organizationName: string
  status: string
}

/** Minimal shape the command palette needs from a team member. */
export interface TeamMemberRef {
  id: string
  name: string
  email: string
}

/** Build an Engagements command-list from raw API data. Skips items missing an id. */
export function buildEngagementCommands(
  engagements: readonly EngagementRef[],
): CommandItem[] {
  const out: CommandItem[] = []
  for (const e of engagements) {
    if (!e.id) continue
    out.push({
      id: `engagement:${e.id}`,
      title: e.packageName || 'Unknown package',
      subtitle: e.organizationName || 'Unknown organization',
      href: `/engagements/${e.id}`,
      group: 'Engagements',
      keywords: [e.packageName, e.organizationName, e.status].filter(Boolean),
      iconName: 'Folder',
    })
  }
  return out
}

/** Build a Team command-list from raw API data. */
export function buildTeamCommands(
  members: readonly TeamMemberRef[],
): CommandItem[] {
  return members
    .filter((m) => m.id)
    .map((m) => ({
      id: `team:${m.id}`,
      title: m.name || m.email,
      subtitle: m.email,
      href: '/team',
      group: 'Team',
      keywords: [m.name, m.email].filter(Boolean),
      iconName: 'User',
    }))
}

/** Build the Pages command-list from the shared nav definition. */
export function getPageCommands(isLeadAssessor: boolean): CommandItem[] {
  const items = getVisibleNavItems(isLeadAssessor)
  // Guard against the unexpected: if ALL_NAV_ITEMS changes, ensure we always
  // return a non-empty array for leads.
  if (isLeadAssessor && items.length !== ALL_NAV_ITEMS.length) {
    // Intentionally permissive — don't hide any page from the palette
    return ALL_NAV_ITEMS.map(toPageCommand)
  }
  return items.map(toPageCommand)
}

function toPageCommand(item: (typeof ALL_NAV_ITEMS)[number]): CommandItem {
  return {
    id: `page:${item.href}`,
    title: item.label,
    subtitle: item.description ?? '',
    href: item.href,
    group: 'Pages',
    keywords: [item.label, item.href, item.description ?? ''].filter(Boolean),
    iconName: item.iconName,
  }
}

// ---- Recently visited engagements (localStorage) ----

export const RECENT_ENGAGEMENTS_KEY = 'c3pao-recent-engagements'
export const MAX_RECENT_ENGAGEMENTS = 5

/** Safely read the recent engagements list. Returns [] on any error. */
export function readRecentEngagements(): EngagementRef[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_ENGAGEMENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is EngagementRef =>
        e &&
        typeof e.id === 'string' &&
        typeof e.packageName === 'string' &&
        typeof e.organizationName === 'string',
    )
  } catch {
    return []
  }
}

/**
 * Prepend an engagement to the recent list, deduplicating by id and capping
 * the list at MAX_RECENT_ENGAGEMENTS. Most recently visited is first.
 */
export function rememberRecentEngagement(engagement: EngagementRef): void {
  if (typeof localStorage === 'undefined') return
  const current = readRecentEngagements()
  const deduped = current.filter((e) => e.id !== engagement.id)
  const next = [engagement, ...deduped].slice(0, MAX_RECENT_ENGAGEMENTS)
  try {
    localStorage.setItem(RECENT_ENGAGEMENTS_KEY, JSON.stringify(next))
  } catch {
    // Quota exceeded or browser extension blocking storage — silently ignore.
    // The command palette falls back to whatever is already cached.
  }
}
