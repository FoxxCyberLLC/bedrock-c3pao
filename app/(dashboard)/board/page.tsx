import { AlertTriangle, LayoutGrid } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PhaseBoard } from '@/components/c3pao/board/phase-board'
import { getPortfolioList } from '@/app/actions/c3pao-portfolio'
import { requireAuth } from '@/lib/auth'

export const metadata = {
  title: 'Board · Bedrock C3PAO',
  description: 'Kanban board showing engagements grouped by CAP v2.0 phase',
}

export default async function BoardPage() {
  const session = await requireAuth()
  if (!session) redirect('/login')

  const result = await getPortfolioList()
  const items = result.success && result.data ? result.data : []
  const apiError = !result.success ? result.error : null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-muted-foreground" />
            Board
          </h1>
          <p className="text-muted-foreground">
            {session.c3paoUser.isLeadAssessor
              ? 'Engagements grouped by CAP v2.0 phase · drag cards to transition phases'
              : 'Engagements grouped by CAP v2.0 phase'}
          </p>
        </div>
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

      <PhaseBoard
        initialItems={items}
        isLeadAssessor={session.c3paoUser.isLeadAssessor}
      />
    </div>
  )
}
