'use client'

/**
 * Assessment Activity card.
 *
 * Lives at the bottom of the Workload dashboard. Shows real engagement-derived
 * metrics per assessor — replaces the old hard-coded skill / domain matrix
 * that nobody was maintaining.
 *
 * Data source: `getC3PAOAssessmentActivity` server action, which combines the
 * workload payload (objectives assessed, engagement list) with per-engagement
 * team rosters (domain assignments). No new Go API endpoints involved.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Activity, Crown, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CMMC_FAMILIES } from '@/lib/cmmc/families'
import type { AssessorActivityItem } from '@/lib/workload/assessment-activity'
import type { WorkloadEngagement } from '@/lib/api-client'
import { getC3PAOAssessmentActivity } from '@/app/actions/c3pao-workload'

const TOTAL_FAMILIES = CMMC_FAMILIES.length

export function AssessmentActivityCard(): React.ReactElement {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<AssessorActivityItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(): Promise<void> {
      setLoading(true)
      const result = await getC3PAOAssessmentActivity()
      if (cancelled) return
      if (result.success && result.data) {
        setItems(result.data)
        setError(null)
      } else {
        setError(result.error ?? 'Failed to load assessment activity')
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-muted-foreground" aria-hidden />
          Assessment Activity
        </CardTitle>
        <CardDescription>
          Engagement coverage and objective progress per assessor
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm dark:border-orange-900 dark:bg-orange-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            <p className="text-orange-900 dark:text-orange-100">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No assessors in the C3PAO.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assessor</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Objectives Assessed</TableHead>
                <TableHead className="text-right">Domains</TableHead>
                <TableHead>Engagements</TableHead>
                <TableHead>Families</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <ActivityRow key={row.assessorId} row={row} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityRow({
  row,
}: {
  row: AssessorActivityItem
}): React.ReactElement {
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          {row.isLeadAssessor && (
            <Crown className="h-3 w-3 text-amber-600" aria-hidden />
          )}
          <span className="font-medium">{row.assessorName}</span>
          <Badge variant="outline" className="text-xs">
            {row.assessorType}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{row.assessorEmail}</p>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.activeEngagements}
      </TableCell>
      <TableCell className="text-right tabular-nums text-emerald-700">
        {row.objectivesAssessed}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.domainsAssigned}
        <span className="text-muted-foreground"> / {TOTAL_FAMILIES}</span>
      </TableCell>
      <TableCell>
        <EngagementChips engagements={row.activeEngagementList} />
      </TableCell>
      <TableCell>
        <FamilyChips codes={row.familyCodes} />
      </TableCell>
    </TableRow>
  )
}

function EngagementChips({
  engagements,
}: {
  engagements: WorkloadEngagement[]
}): React.ReactElement {
  if (engagements.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {engagements.map((e) => (
        <Link
          key={e.id}
          href={`/engagements/${e.id}`}
          className="inline-flex items-center rounded border bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium hover:bg-muted hover:text-foreground"
          title={`${e.organizationName} · ${e.status}${e.currentPhase ? ` · ${e.currentPhase}` : ''}`}
        >
          {e.packageName}
        </Link>
      ))}
    </div>
  )
}

function FamilyChips({ codes }: { codes: string[] }): React.ReactElement {
  if (codes.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {codes.map((code) => (
        <Badge
          key={code}
          variant="outline"
          className="text-[10px] px-1.5 py-0 font-mono"
        >
          {code}
        </Badge>
      ))}
    </div>
  )
}
