'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, MinusCircle, HelpCircle, ClipboardCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { getEngagementObjectives } from '@/app/actions/engagements'
import type { ObjectiveView } from '@/lib/api-client'

interface PreAssessmentSummaryCardProps {
  engagementId: string
}

interface OSCStats {
  total: number
  met: number
  notMet: number
  notApplicable: number
  notAssessed: number
  documented: number
}

function computeOSCStats(objectives: ObjectiveView[]): OSCStats {
  const stats: OSCStats = { total: 0, met: 0, notMet: 0, notApplicable: 0, notAssessed: 0, documented: 0 }
  for (const o of objectives) {
    stats.total++
    if (o.oscImplementationStatement?.trim()) stats.documented++
    switch (o.oscStatus) {
      case 'MET':
      case 'COMPLIANT':
        stats.met++
        break
      case 'NOT_MET':
      case 'NON_COMPLIANT':
        stats.notMet++
        break
      case 'NOT_APPLICABLE':
        stats.notApplicable++
        break
      default:
        stats.notAssessed++
    }
  }
  return stats
}

export function PreAssessmentSummaryCard({ engagementId }: PreAssessmentSummaryCardProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<OSCStats | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const result = await getEngagementObjectives(engagementId)
      if (cancelled) return
      if (result.success && result.data) {
        setStats(computeOSCStats(result.data))
      } else {
        setStats({ total: 0, met: 0, notMet: 0, notApplicable: 0, notAssessed: 0, documented: 0 })
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [engagementId])

  if (loading) {
    return <Skeleton className="h-40 w-full" />
  }
  if (!stats || stats.total === 0) {
    return null
  }

  const assessed = stats.met + stats.notMet + stats.notApplicable
  const assessedPercent = stats.total > 0 ? Math.round((assessed / stats.total) * 100) : 0
  const documentedPercent = stats.total > 0 ? Math.round((stats.documented / stats.total) * 100) : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Contractor Pre-Assessment</CardTitle>
          </div>
          <Badge variant="outline">{assessed} of {stats.total} assessed</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Assessment progress</span>
            <span>{assessedPercent}%</span>
          </div>
          <Progress value={assessedPercent} className="h-2" />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Implementation documented</span>
            <span>{documentedPercent}%</span>
          </div>
          <Progress value={documentedPercent} className="h-2" />
        </div>

        <div className="grid grid-cols-4 gap-3 pt-2">
          <StatTile icon={CheckCircle2} iconClass="text-green-600" label="Met" value={stats.met} />
          <StatTile icon={XCircle} iconClass="text-red-600" label="Not Met" value={stats.notMet} />
          <StatTile icon={MinusCircle} iconClass="text-gray-500" label="N/A" value={stats.notApplicable} />
          <StatTile icon={HelpCircle} iconClass="text-amber-600" label="Not Assessed" value={stats.notAssessed} />
        </div>
      </CardContent>
    </Card>
  )
}

function StatTile({
  icon: Icon,
  iconClass,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconClass: string
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <Icon className={`h-4 w-4 mx-auto ${iconClass}`} />
      <div className="text-xl font-bold mt-1">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  )
}
