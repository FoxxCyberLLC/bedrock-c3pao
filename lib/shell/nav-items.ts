/**
 * Navigation item definitions for the sidebar shell.
 *
 * Defined as a pure data module (no React imports) so nav visibility
 * logic can be unit-tested in the node vitest environment and so the
 * sidebar + command palette can share a single source of truth.
 *
 * The UI layer maps `iconName` to Lucide React components.
 */

/** A single entry in the sidebar nav. */
export interface NavItem {
  label: string
  href: string
  /** Lucide icon name (e.g., "LayoutDashboard"). Resolved by the UI. */
  iconName: string
  /** Only visible when the current assessor is a lead. */
  leadOnly?: boolean
  /** Optional short description for hover tooltips / command palette subtitles. */
  description?: string
}

/**
 * Full sidebar nav in display order.
 *
 * Ordering reflects the C3PAO daily workflow: situational-awareness first
 * (Dashboard, Inbox), then work (Engagements / Board / Calendar), then
 * team management (Workload / Team), then compliance artifacts
 * (Certificates / QA / COI), then infrastructure (Connection / Profile).
 */
export const ALL_NAV_ITEMS: readonly NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    iconName: 'LayoutDashboard',
    description: 'Portfolio command center',
  },
  {
    label: 'Inbox',
    href: '/inbox',
    iconName: 'Inbox',
    description: 'Mentions, phase changes, QA assignments',
  },
  {
    label: 'Engagements',
    href: '/engagements',
    iconName: 'Folder',
    description: 'All assessments — list view',
  },
  {
    label: 'Board',
    href: '/board',
    iconName: 'LayoutGrid',
    description: 'Kanban by CAP phase',
  },
  {
    label: 'Calendar',
    href: '/calendar',
    iconName: 'Calendar',
    description: 'Milestones, in-brief, out-brief, POA&M closeouts',
  },
  {
    label: 'Workload',
    href: '/workload',
    iconName: 'BarChart3',
    description: 'Team workload and skill coverage',
  },
  {
    label: 'Team',
    href: '/team',
    iconName: 'Users',
    description: 'Assessors and credentials',
  },
  {
    label: 'Certificates',
    href: '/certificates',
    iconName: 'ShieldCheck',
    description: 'Issued certs, expiry, POA&M closeouts',
  },
  {
    label: 'QA Queue',
    href: '/qa',
    iconName: 'CheckSquare',
    description: 'Pre-assessment and final-report QA reviews',
  },
  {
    label: 'COI Register',
    href: '/coi',
    iconName: 'ShieldAlert',
    leadOnly: true,
    description: 'Conflicts of interest (lead only)',
  },
  {
    label: 'Connection',
    href: '/connection',
    iconName: 'Plug',
    description: 'Go API connectivity status',
  },
  {
    label: 'Profile',
    href: '/profile',
    iconName: 'Settings',
    description: 'C3PAO organization profile',
  },
]

/** Return the nav items visible to the current user based on lead status. */
export function getVisibleNavItems(isLeadAssessor: boolean): NavItem[] {
  if (isLeadAssessor) return [...ALL_NAV_ITEMS]
  return ALL_NAV_ITEMS.filter((item) => !item.leadOnly)
}

/**
 * Determine whether `itemHref` should be rendered as the active route given
 * the current `pathname`.
 *
 * - `/` matches only the exact dashboard home.
 * - Other routes match on strict prefix PLUS a boundary character (end or `/`)
 *   so `/team` does NOT match a hypothetical sibling `/teams-old`.
 *
 * Returns false for null/undefined pathnames (SSR edge case).
 */
export function isActiveRoute(
  pathname: string | null | undefined,
  itemHref: string,
): boolean {
  if (!pathname) return false
  if (itemHref === '/') return pathname === '/'
  if (pathname === itemHref) return true
  return pathname.startsWith(itemHref + '/')
}
