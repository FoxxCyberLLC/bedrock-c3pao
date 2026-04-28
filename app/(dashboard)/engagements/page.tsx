import { AlertTriangle, FolderKanban } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EngagementsList } from '@/components/c3pao/engagements/engagements-list'
import { NewOutsideEngagementDialog } from '@/components/c3pao/engagements/new-outside-engagement-dialog'
import { getPortfolioList } from '@/app/actions/c3pao-portfolio'
import { getC3PAOEngagements } from '@/app/actions/engagements'
import { getC3PAOTeam } from '@/app/actions/c3pao-dashboard'
import { listOutsideEngagementsAction } from '@/app/actions/c3pao-outside-engagement'
import {
  listActiveSnoozesAction,
  listAllTagLabels,
  listEngagementTagsByEngagement,
  listPinnedEngagementIds,
  listSavedViewsAction,
} from '@/app/actions/c3pao-personal-views'
import { requireAuth } from '@/lib/auth'
import type { PortfolioRow } from '@/lib/engagements-list/types'
import type {
  ActiveSnooze,
  EngagementTag,
  SavedView,
} from '@/lib/personal-views-types'

export const metadata = {
  title: 'Engagements · Bedrock C3PAO',
  description: 'Portfolio-wide engagements list with saved views and bulk actions',
}

interface EngagementsPageProps {
  searchParams: Promise<{ lead?: string | string[] }>
}

export default async function C3PAOEngagementsPage({
  searchParams,
}: EngagementsPageProps) {
  const session = await requireAuth()
  if (!session) redirect('/login')

  const [
    { lead: leadParam },
    listResult,
    assessmentsResult,
    teamResult,
    pinnedResult,
    tagsByEngagementResult,
    allTagLabelsResult,
    snoozesResult,
    savedViewsResult,
    outsideResult,
  ] = await Promise.all([
    searchParams,
    getPortfolioList(),
    getC3PAOEngagements(),
    getC3PAOTeam(),
    listPinnedEngagementIds(),
    listEngagementTagsByEngagement(),
    listAllTagLabels(),
    listActiveSnoozesAction(),
    listSavedViewsAction(),
    listOutsideEngagementsAction(),
  ])

  const portfolioItems =
    listResult.success && listResult.data ? listResult.data : []

  // Build a lookup of findingsCount by engagement id so we can attach it to
  // each portfolio row. The /portfolio-list endpoint doesn't return it, but
  // /assessments does — fetching in parallel keeps the page server-side
  // round-trip the same as before.
  const findingsById = new Map<string, number | null>()
  if (assessmentsResult.success && assessmentsResult.data) {
    for (const summary of assessmentsResult.data) {
      findingsById.set(summary.id, summary.findingsCount)
    }
  }

  const oscRows: PortfolioRow[] = portfolioItems.map((item) => ({
    ...item,
    findingsCount: findingsById.get(item.id) ?? null,
    kind: 'osc' as const,
  }))

  // Outside engagements live in local Postgres. Map onto the same row shape
  // with placeholder fields where the OSC concept does not apply.
  const outsideRows: PortfolioRow[] =
    outsideResult.success && outsideResult.data
      ? outsideResult.data.map((eng) => ({
          id: eng.id,
          packageName: eng.name,
          organizationName: eng.clientName,
          status: eng.status,
          currentPhase: null,
          leadAssessorId: eng.leadAssessorId,
          leadAssessorName: eng.leadAssessorName,
          scheduledStartDate: eng.scheduledStartDate,
          scheduledEndDate: eng.scheduledEndDate,
          daysInPhase: 0,
          objectivesTotal: 110,
          objectivesAssessed: 0,
          assessmentResult: null,
          certStatus: null,
          certExpiresAt: null,
          poamCloseoutDue: null,
          reevalWindowOpenUntil: null,
          createdAt: eng.createdAt,
          updatedAt: eng.updatedAt,
          findingsCount: null,
          kind: 'outside_osc' as const,
        }))
      : []

  const items: PortfolioRow[] = [...oscRows, ...outsideRows]

  const team =
    teamResult.success && teamResult.data ? (teamResult.data as Array<{ id: string; name: string }>) : []
  const apiError = !listResult.success ? listResult.error : null

  // Lead options for the bulk re-assign menu. Include everyone on the team
  // (backend enforces lead-capability when the role is updated).
  const leadOptions: ReadonlyArray<readonly [string, string]> = team
    .filter((m) => m.id && m.name)
    .map((m) => [m.id, m.name] as const)
    .sort((a, b) => a[1].localeCompare(b[1]))

  // Resolve the lead filter (single string only — array values are ignored).
  const initialLeadFilterId = typeof leadParam === 'string' ? leadParam : undefined
  const initialLeadFilterName = initialLeadFilterId
    ? leadOptions.find(([id]) => id === initialLeadFilterId)?.[1]
    : undefined

  // Personal-view state — local Postgres outage should not crash the page.
  const initialPinnedIds: string[] = unwrapPersonal(
    pinnedResult,
    [] as string[],
    'pinned engagements',
  )
  const initialTagsByEngagement: Record<string, EngagementTag[]> = unwrapPersonal(
    tagsByEngagementResult,
    {} as Record<string, EngagementTag[]>,
    'engagement tags',
  )
  const initialAllTagLabels: string[] = unwrapPersonal(
    allTagLabelsResult,
    [] as string[],
    'tag labels',
  )
  const initialActiveSnoozes: ActiveSnooze[] = unwrapPersonal(
    snoozesResult,
    [] as ActiveSnooze[],
    'active snoozes',
  )
  const initialSavedViews: SavedView[] = unwrapPersonal(
    savedViewsResult,
    [] as SavedView[],
    'saved views',
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <FolderKanban className="h-6 w-6 text-muted-foreground" />
            Engagements
          </h1>
          <p className="text-muted-foreground">
            Portfolio-wide view of every engagement · saved views, grouping, and
            bulk actions.
          </p>
        </div>
        <NewOutsideEngagementDialog leadOptions={leadOptions.map(([id, name]) => ({ id, name }))} />
      </div>

      {apiError && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-orange-900 dark:text-orange-100">
                Unable to load engagements
              </p>
              <p className="mt-0.5 text-xs text-orange-800 dark:text-orange-300">
                {apiError}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/connection">Check Connection</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <EngagementsList
        initialItems={items}
        currentUserId={session.c3paoUser.id}
        leadOptions={leadOptions}
        initialLeadFilterId={initialLeadFilterId}
        initialLeadFilterName={initialLeadFilterName}
        initialPinnedIds={initialPinnedIds}
        initialTagsByEngagement={initialTagsByEngagement}
        initialAllTagLabels={initialAllTagLabels}
        initialActiveSnoozes={initialActiveSnoozes}
        initialSavedViews={initialSavedViews}
      />
    </div>
  )
}

/**
 * Unwrap an `ActionResult` from the personal-views actions, falling back
 * to a default when the local Postgres is unavailable. Logs a warning so
 * operators see the underlying issue without the page crashing.
 */
function unwrapPersonal<T>(
  result: { success: boolean; data?: T; error?: string },
  fallback: T,
  label: string,
): T {
  if (result.success && result.data !== undefined) return result.data
  if (result.error) {
    console.warn(`[engagements] failed to load ${label}: ${result.error}`)
  }
  return fallback
}
