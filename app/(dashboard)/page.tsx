import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PortfolioKpiHero } from '@/components/c3pao/portfolio/portfolio-kpi-hero'
import { PortfolioThisWeek } from '@/components/c3pao/portfolio/portfolio-this-week'
import { PortfolioThroughputSparkline } from '@/components/c3pao/portfolio/portfolio-throughput-sparkline'
import { PortfolioActivityStream } from '@/components/c3pao/portfolio/portfolio-activity-stream'
import { getPortfolioStats, getPortfolioList } from '@/app/actions/c3pao-portfolio'
import { filterMyAssigned } from '@/lib/portfolio/derive-risk'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await requireAuth()
  if (!session) redirect('/login')

  const [statsResult, listResult] = await Promise.all([
    getPortfolioStats(),
    getPortfolioList(),
  ])

  const stats = statsResult.success ? statsResult.data : null
  const allItems = listResult.success && listResult.data ? listResult.data : []
  const apiError =
    !statsResult.success || !listResult.success
      ? statsResult.error || listResult.error
      : null

  const isLead = session.c3paoUser.isLeadAssessor
  const myItems = isLead
    ? allItems
    : filterMyAssigned(allItems, session.c3paoUser.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isLead ? 'Portfolio' : 'My Assignments'}
        </h1>
        <p className="text-muted-foreground">
          {isLead
            ? `${session.c3paoUser.c3paoName} · Lead assessor view`
            : `Welcome back, ${session.c3paoUser.name}`}
        </p>
      </div>

      {apiError && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-orange-900 dark:text-orange-100">
                Unable to load the latest portfolio data
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

      {/* KPI hero: lead-only. Assessors see a slimmer summary. */}
      {isLead && stats && <PortfolioKpiHero stats={stats} />}
      {!isLead && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Active" value={myItems.filter((i) => !['COMPLETED', 'CANCELLED'].includes(i.status)).length} />
              <Stat
                label="In Progress"
                value={myItems.filter((i) => i.status === 'IN_PROGRESS').length}
              />
              <Stat
                label="Pending Approval"
                value={
                  myItems.filter((i) => i.status === 'PENDING_APPROVAL').length
                }
              />
              <Stat
                label="Completed"
                value={myItems.filter((i) => i.status === 'COMPLETED').length}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-column layout: this-week + activity on the left, sparkline on the right */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <PortfolioThisWeek items={myItems} />
          <PortfolioActivityStream items={myItems} />
        </div>
        <div className="space-y-4">
          {stats && <PortfolioThroughputSparkline weeks={stats.throughputLast8Weeks} />}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
