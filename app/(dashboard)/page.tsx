import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getC3PAOEngagements } from '@/app/actions/engagements'
import {
  LayoutDashboard,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await requireAuth()
  if (!session) redirect('/login')

  const result = await getC3PAOEngagements()
  const engagements = result.data || []

  const newRequests = engagements.filter(e => e.status === 'REQUESTED').length
  const inProgress = engagements.filter(e => e.status === 'IN_PROGRESS').length
  const completed = engagements.filter(e => e.status === 'COMPLETED').length
  const totalActive = engagements.filter(e => !['COMPLETED', 'CANCELLED'].includes(e.status)).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {session.c3paoUser.name}
        </h1>
        <p className="text-muted-foreground">
          {session.c3paoUser.c3paoName} Assessment Portal
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              New Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newRequests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Total Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link href="/engagements">
                View All Engagements
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link href="/team">
                View Team
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link href="/workload">
                Team Workload
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Engagements */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Engagements</CardTitle>
            <CardDescription>Latest assessment activity</CardDescription>
          </CardHeader>
          <CardContent>
            {engagements.length === 0 ? (
              <p className="text-muted-foreground text-sm">No engagements yet.</p>
            ) : (
              <div className="space-y-3">
                {engagements.slice(0, 5).map((eng) => (
                  <Link
                    key={eng.id}
                    href={`/engagements/${eng.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{eng.packageName}</p>
                      <p className="text-xs text-muted-foreground">{eng.customerName}</p>
                    </div>
                    <Badge variant="outline">{eng.status.replace(/_/g, ' ')}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
