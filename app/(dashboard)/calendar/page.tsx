import { AlertTriangle, Calendar as CalendarIcon } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EngagementCalendar } from '@/components/c3pao/calendar/engagement-calendar'
import { getPortfolioList } from '@/app/actions/c3pao-portfolio'
import { requireAuth } from '@/lib/auth'

export const metadata = {
  title: 'Calendar · Bedrock C3PAO',
  description: 'Milestones, in-briefs, out-briefs, POA&M closeouts, and cert expiries',
}

export default async function CalendarPage() {
  const session = await requireAuth()
  if (!session) redirect('/login')

  const result = await getPortfolioList()
  const items = result.success && result.data ? result.data : []
  const apiError = !result.success ? result.error : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <CalendarIcon className="h-6 w-6 text-muted-foreground" />
          Calendar
        </h1>
        <p className="text-muted-foreground">
          Upcoming milestones across the portfolio — scheduled start/end dates,
          POA&M closeouts, and certificate expiries.
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

      <EngagementCalendar items={items} />
    </div>
  )
}
