import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ChevronLeft,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ListChecks,
  Target,
  AlertTriangle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'

import { requireAuth } from '@/lib/auth'
import { getPOAMForC3PAO } from '@/app/actions/c3pao-dashboard'
import {
  calculateCompletionPercentage,
  getDaysRemaining,
  getDeadlineWarningLevel,
} from '@/lib/utils/poam-rules'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{
    id: string
    poamId: string
  }>
}

export default async function C3PAOPOAMDetailPage({ params }: PageProps) {
  const { id: engagementId, poamId } = await params

  const session = await requireAuth()
  if (!session) {
    redirect('/login')
  }

  const result = await getPOAMForC3PAO(poamId, engagementId)

  if (!result.success || !result.data) {
    // Show not available state for stub
    return (
      <div className="container mx-auto py-8 space-y-8">
        <Button variant="ghost" asChild>
          <Link href={`/engagements/${engagementId}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Engagement
          </Link>
        </Button>
        <div className="text-center py-16 space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold">POA&M Detail</h2>
          <p className="text-muted-foreground">
            {result.error || 'POA&M details are not available at this time.'}
          </p>
        </div>
      </div>
    )
  }

  // API returns a single POAMView directly
  const poam = result.data
  const completionPercentage = calculateCompletionPercentage(poam.milestones)
  const daysRemaining = getDaysRemaining(new Date(poam.deadline))
  const warningLevel = getDeadlineWarningLevel(new Date(poam.deadline))

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href={`/engagements/${engagementId}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Engagement
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <RiskBadge riskLevel={poam.riskLevel} />
              <StatusBadge status={poam.status} />
              <TypeBadge type={poam.type} />
              <Badge variant="outline">Read Only</Badge>
            </div>
            <h1 className="text-3xl font-bold">{poam.title}</h1>
            <p className="text-muted-foreground">
              POA&M Item — Read-Only Review
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{poam.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Remediation Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{poam.remediationPlan}</p>
            </CardContent>
          </Card>

          {poam.milestones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Milestones ({poam.milestones.filter((m: { completed: boolean }) => m.completed).length}/{poam.milestones.length} complete)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {poam.milestones.map((milestone: { id: string; completed: boolean; description: string; dueDate: string; completedDate: string | null }) => (
                    <div
                      key={milestone.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg',
                        milestone.completed ? 'bg-green-500/5' : 'bg-muted/50'
                      )}
                    >
                      {milestone.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={cn('font-medium', milestone.completed && 'line-through text-muted-foreground')}>
                          {milestone.description}
                        </p>
                        <div className="text-sm text-muted-foreground mt-1">
                          Due: {format(new Date(milestone.dueDate), 'MMM d, yyyy')}
                          {milestone.completedDate && (
                            <span className="ml-2 text-green-600">
                              Completed {format(new Date(milestone.completedDate), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium">{completionPercentage}%</span>
                </div>
                <Progress value={completionPercentage} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(poam.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <AlertCircle
                  className={cn(
                    'h-5 w-5 mt-0.5',
                    warningLevel === 'critical' && 'text-red-600',
                    warningLevel === 'warning' && 'text-orange-600',
                    warningLevel === 'normal' && 'text-muted-foreground'
                  )}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Deadline</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(poam.deadline), 'MMM d, yyyy')}
                  </p>
                  {poam.status !== 'CLOSED' && (
                    <p
                      className={cn(
                        'text-xs mt-1',
                        warningLevel === 'critical' && 'text-red-600',
                        warningLevel === 'warning' && 'text-orange-600',
                        warningLevel === 'normal' && 'text-muted-foreground'
                      )}
                    >
                      {daysRemaining < 0
                        ? `Overdue by ${Math.abs(daysRemaining)} days`
                        : `${daysRemaining} days remaining`}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                Assessor Note
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                As an assessor reviewing this POA&M, consider the following:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Is the remediation plan adequate for the deficiency?</li>
                <li>Are milestones realistic and achievable?</li>
                <li>Is progress being tracked appropriately?</li>
                <li>Does the timeline meet CMMC requirements for this risk level?</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function RiskBadge({ riskLevel }: { riskLevel: string }) {
  const variants: Record<string, { variant: 'destructive' | 'default' | 'secondary'; icon: React.ElementType }> = {
    CRITICAL: { variant: 'destructive', icon: AlertCircle },
    HIGH: { variant: 'destructive', icon: AlertCircle },
    MODERATE: { variant: 'default', icon: AlertCircle },
    LOW: { variant: 'secondary', icon: AlertCircle },
  }

  const { variant, icon: Icon } = variants[riskLevel] || variants.MODERATE

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {riskLevel}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: 'destructive' | 'default' | 'outline'; className?: string }> = {
    OPEN: { variant: 'outline' },
    IN_PROGRESS: { variant: 'default', className: 'bg-blue-600' },
    CLOSED: { variant: 'default', className: 'bg-green-600' },
    OVERDUE: { variant: 'destructive' },
  }

  const { variant, className } = variants[status] || variants.OPEN

  return (
    <Badge variant={variant} className={className}>
      {status.replace('_', ' ')}
    </Badge>
  )
}

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className="text-xs">
      {type === 'ASSESSMENT' ? 'Assessment' : 'Operational'}
    </Badge>
  )
}
