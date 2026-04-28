'use client'

/**
 * Workload dashboard (Task 12 rebuild).
 *
 * Consumes the fixed Go API /workload endpoint with real pending/completed
 * counts, per-assessor engagement lists, skill matrices, and CCA/CCP cert
 * expiry. Replaces the old hard-coded-zero mapping from earlier.
 *
 * Sections:
 *   - Top KPI strip (total assessors, active, pending, completed)
 *   - Cert expiry alerts (any assessor with CCA/CCP expiring in ≤90 days)
 *   - Team workload table with per-row capacity bar
 *   - Assessment Activity card (real engagement coverage / objective progress)
 */

import { useCallback, useEffect, useState } from 'react'
import { differenceInDays } from 'date-fns'
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Crown,
  Loader2,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { safeDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { getC3PAOWorkloadOverview } from '@/app/actions/c3pao-workload'
import type { AssessorWorkloadItem } from '@/lib/api-client'
import { deriveCapacity } from '@/lib/workload/capacity'
import { CMMC_FAMILIES } from '@/lib/cmmc/families'
import { AssessmentActivityCard } from '@/components/c3pao/assessment-activity-card'
import {
  CapacityBandBadge,
  CredExpiryBadge,
  KpiCard,
} from '@/components/c3pao/workload-helpers'

/** Default max active engagements per assessor. Configurable later. */
const DEFAULT_CAPACITY = 3

export function WorkloadDashboard() {
  const [loading, setLoading] = useState(true)
  const [assessors, setAssessors] = useState<AssessorWorkloadItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await getC3PAOWorkloadOverview()
    if (result.success && result.data) {
      setAssessors(result.data.assessors)
      setError(null)
    } else {
      setError(result.error ?? 'Failed to load workload')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
        <CardContent className="flex items-start gap-3 py-6">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
          <div>
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
              Unable to load workload
            </p>
            <p className="mt-0.5 text-xs text-orange-800 dark:text-orange-300">
              {error}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalActive = assessors.reduce((sum, a) => sum + a.activeEngagements, 0)
  const totalPending = assessors.reduce((sum, a) => sum + a.pendingEngagements, 0)
  const totalCompleted = assessors.reduce(
    (sum, a) => sum + a.completedEngagements,
    0,
  )

  // Find assessors with expiring credentials (≤90 days or already expired).
  const now = new Date()
  const expiringAlerts = assessors.filter((a) => {
    const cca = safeDate(a.ccaExpiresAt)
    const ccp = safeDate(a.ccpExpiresAt)
    const ccaDays = cca ? differenceInDays(cca, now) : Infinity
    const ccpDays = ccp ? differenceInDays(ccp, now) : Infinity
    return ccaDays <= 90 || ccpDays <= 90
  })

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={Users} label="Total Assessors" value={assessors.length} />
        <KpiCard
          icon={Briefcase}
          label="Active"
          value={totalActive}
          accentClass="text-primary"
        />
        <KpiCard
          icon={TrendingUp}
          label="Pending"
          value={totalPending}
          accentClass="text-amber-600"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Completed"
          value={totalCompleted}
          accentClass="text-emerald-600"
        />
      </div>

      {/* Cert expiry alerts */}
      {expiringAlerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-amber-600" aria-hidden />
              Expiring Credentials
            </CardTitle>
            <CardDescription>
              CCA / CCP credentials expiring within 90 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {expiringAlerts.map((a) => (
                <li
                  key={a.assessorId}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex items-center gap-1.5">
                    {a.isLeadAssessor && (
                      <Crown className="h-3 w-3 text-amber-600" aria-hidden />
                    )}
                    <span className="font-medium">{a.assessorName}</span>
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    {a.ccaExpiresAt && (
                      <CredExpiryBadge
                        label="CCA"
                        expiresAt={a.ccaExpiresAt}
                        now={now}
                      />
                    )}
                    {a.ccpExpiresAt && (
                      <CredExpiryBadge
                        label="CCP"
                        expiresAt={a.ccpExpiresAt}
                        now={now}
                      />
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Team workload table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Workload</CardTitle>
          <CardDescription>
            Active / Pending / Completed counts with capacity utilization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assessors.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No assessors in the C3PAO.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessor</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="w-[180px]">Capacity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessors.map((a) => {
                  const utilization = Math.min(
                    100,
                    (a.activeEngagements / DEFAULT_CAPACITY) * 100,
                  )
                  const overloaded = a.activeEngagements > DEFAULT_CAPACITY
                  const capacity = deriveCapacity(a.activeEngagements)
                  return (
                    <TableRow key={a.assessorId}>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {a.isLeadAssessor && (
                            <Crown
                              className="h-3 w-3 text-amber-600"
                              aria-hidden
                            />
                          )}
                          <span className="font-medium">{a.assessorName}</span>
                          <Badge variant="outline" className="text-xs">
                            {a.assessorType}
                          </Badge>
                          <CapacityBandBadge band={capacity.band} label={capacity.label} title={capacity.description} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {a.assessorEmail}
                          <span className="ml-2">
                            · Domains: {a.domainsAssigned} / {CMMC_FAMILIES.length}
                          </span>
                        </p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {a.activeEngagements}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-amber-700">
                        {a.pendingEngagements}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700">
                        {a.completedEngagements}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <Progress
                            value={utilization}
                            className={cn('h-1.5', overloaded && '[&>*]:bg-rose-500')}
                          />
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            {a.activeEngagements}/{DEFAULT_CAPACITY}
                            {overloaded && ' · overloaded'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assessment Activity (replaces former skill / domain matrix) */}
      <AssessmentActivityCard />
    </div>
  )
}

