'use client'

import { useState } from 'react'
import { format, differenceInDays, isPast } from 'date-fns'
import { safeDate } from '@/lib/utils'
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Calendar,
  Target,
  ListChecks,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface POAMRequirement {
  id: string
  requirement: {
    requirementId: string
    title: string
  }
}

interface POAMMilestone {
  id: string
  description: string
  dueDate: Date
  completed: boolean
  completedDate: Date | null
  sortOrder: number
}

interface POAM {
  id: string
  title: string
  description: string
  status: string
  riskLevel: string
  type: string
  remediationPlan: string
  scheduledCompletionDate: Date
  actualCompletionDate: Date | null
  deadline: Date
  daysToRemediate: number
  createdAt: Date
  requirements: POAMRequirement[]
  milestones: POAMMilestone[]
}

interface POAMViewerProps {
  poams: POAM[]
}

const riskColors: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-red-600/10', text: 'text-red-600', border: 'border-red-600/20' },
  HIGH: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/20' },
  MODERATE: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/20' },
  LOW: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
}

const statusConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  OPEN: { label: 'Open', icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-500/10' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  CLOSED: { label: 'Closed', icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-500/10' },
  OVERDUE: { label: 'Overdue', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-500/10' },
}

export function POAMViewer({ poams }: POAMViewerProps) {
  const [expandedPoams, setExpandedPoams] = useState<Set<string>>(new Set())

  // Calculate stats
  const stats = {
    total: poams.length,
    open: poams.filter(p => p.status === 'OPEN').length,
    inProgress: poams.filter(p => p.status === 'IN_PROGRESS').length,
    closed: poams.filter(p => p.status === 'CLOSED').length,
    overdue: poams.filter(p => p.status === 'OVERDUE' || (p.status !== 'CLOSED' && safeDate(p.deadline) && isPast(safeDate(p.deadline)!))).length,
    critical: poams.filter(p => p.riskLevel === 'CRITICAL').length,
    high: poams.filter(p => p.riskLevel === 'HIGH').length,
  }

  const togglePoam = (poamId: string) => {
    setExpandedPoams((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(poamId)) {
        newSet.delete(poamId)
      } else {
        newSet.add(poamId)
      }
      return newSet
    })
  }

  const getRiskBadge = (riskLevel: string) => {
    const colors = riskColors[riskLevel] || riskColors.LOW
    return (
      <Badge className={`${colors.bg} ${colors.text} ${colors.border}`}>
        {riskLevel}
      </Badge>
    )
  }

  const getStatusDisplay = (status: string, deadline: Date) => {
    // Check if overdue
    const isOverdue = status !== 'CLOSED' && safeDate(deadline) != null && isPast(safeDate(deadline)!)
    const config = isOverdue ? statusConfig.OVERDUE : (statusConfig[status] || statusConfig.OPEN)
    const Icon = config.icon

    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bgColor}`}>
        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
      </div>
    )
  }

  const getDaysRemaining = (deadline: Date) => {
    const d = safeDate(deadline)
    if (!d) return { text: 'No deadline', color: 'text-muted-foreground' }
    const days = differenceInDays(d, new Date())
    if (days < 0) return { text: `${Math.abs(days)} days overdue`, color: 'text-red-600' }
    if (days === 0) return { text: 'Due today', color: 'text-orange-600' }
    if (days <= 7) return { text: `${days} days remaining`, color: 'text-yellow-600' }
    if (days <= 30) return { text: `${days} days remaining`, color: 'text-blue-600' }
    return { text: `${days} days remaining`, color: 'text-green-600' }
  }

  const getMilestoneProgress = (milestones: POAMMilestone[]) => {
    if (milestones.length === 0) return 0
    const completed = milestones.filter(m => m.completed).length
    return (completed / milestones.length) * 100
  }

  if (poams.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500/50" />
          <h3 className="mt-4 text-lg font-semibold">No POA&Ms Found</h3>
          <p className="text-muted-foreground mt-1">
            This package has no Plan of Action & Milestones entries
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">POA&M Overview</CardTitle>
          <CardDescription>
            {stats.total} total items | {stats.closed} resolved | {stats.open + stats.inProgress} pending
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Items</div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10">
              <div className="text-2xl font-bold text-yellow-600">{stats.open}</div>
              <div className="text-xs text-muted-foreground">Open</div>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10">
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <div className="text-2xl font-bold text-green-600">{stats.closed}</div>
              <div className="text-xs text-muted-foreground">Closed</div>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/10">
              <div className="text-2xl font-bold text-orange-600">{stats.critical + stats.high}</div>
              <div className="text-xs text-muted-foreground">High Risk</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* POA&M List */}
      <div className="space-y-3">
        {poams.map((poam) => {
          const isExpanded = expandedPoams.has(poam.id)
          const daysInfo = getDaysRemaining(poam.deadline)
          const milestoneProgress = getMilestoneProgress(poam.milestones)

          return (
            <Collapsible
              key={poam.id}
              open={isExpanded}
              onOpenChange={() => togglePoam(poam.id)}
            >
              <Card className={poam.status === 'OVERDUE' || (poam.status !== 'CLOSED' && safeDate(poam.deadline) && isPast(safeDate(poam.deadline)!)) ? 'border-red-500/50' : ''}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground mt-0.5" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getRiskBadge(poam.riskLevel)}
                            {getStatusDisplay(poam.status, poam.deadline)}
                            <Badge variant="outline" className="text-xs">
                              {poam.type === 'ASSESSMENT' ? 'Assessment' : 'Operational'}
                            </Badge>
                          </div>
                          <CardTitle className="text-base">{poam.title}</CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">
                            {poam.description}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className={`text-sm font-medium ${daysInfo.color}`}>
                          {daysInfo.text}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Due: {safeDate(poam.scheduledCompletionDate) ? format(safeDate(poam.scheduledCompletionDate)!, 'MMM d, yyyy') : '—'}
                        </div>
                        {poam.milestones.length > 0 && (
                          <div className="flex items-center gap-2 justify-end">
                            <Progress value={milestoneProgress} className="w-16 h-1.5" />
                            <span className="text-xs text-muted-foreground">
                              {poam.milestones.filter(m => m.completed).length}/{poam.milestones.length}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Linked Requirements */}
                    {(poam.requirements ?? []).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-sm font-medium">Linked Requirements ({poam.requirements.length})</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {poam.requirements.map((req) => (
                            <Badge key={req.id} variant="outline" className="text-xs">
                              {req.requirement.requirementId}: {req.requirement.title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Remediation Plan */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-medium">Remediation Plan</h4>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{poam.remediationPlan}</p>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground">Created</div>
                          <div className="font-medium">{safeDate(poam.createdAt) ? format(safeDate(poam.createdAt)!, 'MMM d, yyyy') : '—'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground">Days to Remediate</div>
                          <div className="font-medium">{poam.daysToRemediate} days</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground">Deadline</div>
                          <div className="font-medium">{safeDate(poam.deadline) ? format(safeDate(poam.deadline)!, 'MMM d, yyyy') : '—'}</div>
                        </div>
                      </div>
                      {poam.actualCompletionDate && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="text-xs text-muted-foreground">Completed</div>
                            <div className="font-medium">{safeDate(poam.actualCompletionDate) ? format(safeDate(poam.actualCompletionDate)!, 'MMM d, yyyy') : '—'}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Milestones */}
                    {poam.milestones.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <ListChecks className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-sm font-medium">
                            Milestones ({poam.milestones.filter(m => m.completed).length}/{poam.milestones.length} complete)
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {poam.milestones.map((milestone) => (
                            <div
                              key={milestone.id}
                              className={`flex items-start gap-3 p-2 rounded-lg ${
                                milestone.completed ? 'bg-green-500/5' : 'bg-muted/50'
                              }`}
                            >
                              {milestone.completed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <p className={`text-sm ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}>
                                  {milestone.description}
                                </p>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  Due: {safeDate(milestone.dueDate) ? format(safeDate(milestone.dueDate)!, 'MMM d, yyyy') : '—'}
                                  {safeDate(milestone.completedDate) && (
                                    <span className="ml-2 text-green-600">
                                      • Completed {format(safeDate(milestone.completedDate)!, 'MMM d, yyyy')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}
