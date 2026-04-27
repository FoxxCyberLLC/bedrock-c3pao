import { AlertTriangle, FolderKanban } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EngagementsList } from '@/components/c3pao/engagements/engagements-list'
import { getPortfolioList } from '@/app/actions/c3pao-portfolio'
import { getC3PAOEngagements } from '@/app/actions/engagements'
import { getC3PAOTeam } from '@/app/actions/c3pao-dashboard'
import { requireAuth } from '@/lib/auth'
import type { PortfolioRow } from '@/lib/engagements-list/types'

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

  const [{ lead: leadParam }, listResult, assessmentsResult, teamResult] = await Promise.all([
    searchParams,
    getPortfolioList(),
    getC3PAOEngagements(),
    getC3PAOTeam(),
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

  const items: PortfolioRow[] = portfolioItems.map((item) => ({
    ...item,
    findingsCount: findingsById.get(item.id) ?? null,
  }))

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

  return (
    <div className="space-y-6">
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
      />
    </div>
  )
}
