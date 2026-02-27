'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  Users,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  getAssessmentProgress,
  getProgressByAssessor,
  getProgressByDomain,
} from '@/app/actions/c3pao-assessment'
import type { DailyProgress, AssessorProgress, DomainProgress } from '@/lib/api-client'

interface AssessmentProgressTrackerProps {
  engagementId: string
}

function safePercent(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0
  return Math.round((numerator / denominator) * 100)
}

export function AssessmentProgressTracker({ engagementId }: AssessmentProgressTrackerProps) {
  const [overall, setOverall] = useState<DailyProgress | null>(null)
  const [byAssessor, setByAssessor] = useState<AssessorProgress[]>([])
  const [byDomain, setByDomain] = useState<DomainProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadAll = useCallback(async () => {
    const [overallResult, assessorResult, domainResult] = await Promise.all([
      getAssessmentProgress(engagementId),
      getProgressByAssessor(engagementId),
      getProgressByDomain(engagementId),
    ])

    if (overallResult.success && overallResult.data) {
      setOverall(overallResult.data)
    }
    if (assessorResult.success && assessorResult.data) {
      setByAssessor(assessorResult.data)
    }
    if (domainResult.success && domainResult.data) {
      setByDomain(domainResult.data.sort((a, b) => a.familyCode.localeCompare(b.familyCode)))
    }
  }, [engagementId])

  useEffect(() => {
    setLoading(true)
    loadAll().finally(() => setLoading(false))
  }, [loadAll])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
  }

  // ----- Loading state -----
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  const assessedPct = overall ? safePercent(overall.assessed, overall.total) : 0

  return (
    <div className="space-y-6">
      {/* ===================== Overall Progress ===================== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Overall Assessment Progress
              </CardTitle>
              <CardDescription>
                {overall
                  ? `${overall.assessed} of ${overall.total} objectives assessed (${assessedPct}%)`
                  : 'No progress data available'}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-1.5 hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Large progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">{assessedPct}%</span>
            </div>
            <Progress value={assessedPct} className="h-3" />
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total */}
            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Objectives</p>
              <p className="text-2xl font-bold">{overall?.total ?? 0}</p>
            </div>

            {/* Assessed */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30 p-3 space-y-1">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">Assessed</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{overall?.assessed ?? 0}</p>
            </div>

            {/* MET */}
            <div className="rounded-lg border border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30 p-3 space-y-1">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wide flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                MET
              </p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{overall?.met ?? 0}</p>
            </div>

            {/* NOT MET */}
            <div className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30 p-3 space-y-1">
              <p className="text-xs text-red-600 dark:text-red-400 font-medium uppercase tracking-wide flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                NOT MET
              </p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{overall?.notMet ?? 0}</p>
            </div>
          </div>

          {/* Additional stats row */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>N/A: <span className="font-medium text-foreground">{overall?.notApplicable ?? 0}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>Not Assessed: <span className="font-medium text-foreground">{overall?.notAssessed ?? 0}</span></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===================== Progress by Domain ===================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Progress by Domain
          </CardTitle>
          <CardDescription>
            Assessment completion across CMMC control families
          </CardDescription>
        </CardHeader>

        <CardContent>
          {byDomain.length === 0 ? (
            <p className="text-sm text-muted-foreground">No domain progress data available.</p>
          ) : (
            <div className="space-y-4">
              {byDomain.map((domain) => {
                const domainPct = safePercent(domain.assessed, domain.total)
                return (
                  <div key={domain.familyCode} className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {domain.familyCode} &mdash; {domain.familyName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {domain.assessed} / {domain.total} assessed
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800 text-xs">
                          <CheckCircle2 className="h-3 w-3" />
                          {domain.met}
                        </Badge>
                        <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800 text-xs">
                          <XCircle className="h-3 w-3" />
                          {domain.notMet}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          N/A {domain.notApplicable}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={domainPct} className="h-2" />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===================== Progress by Assessor ===================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Progress by Assessor
          </CardTitle>
          <CardDescription>
            Individual assessor contributions
          </CardDescription>
        </CardHeader>

        <CardContent>
          {byAssessor.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assessor progress data available.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {byAssessor.map((assessor) => {
                const assessorTotal = assessor.met + assessor.notMet + assessor.notApplicable
                const assessorMetPct = safePercent(assessor.met, assessorTotal || assessor.assessed)
                return (
                  <div
                    key={assessor.assessorId}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{assessor.assessorName}</p>
                      <Badge variant="outline" className="text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700 text-xs">
                        {assessor.assessed} assessed
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        {assessor.met} MET
                      </Badge>
                      <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800 text-xs">
                        <XCircle className="h-3 w-3" />
                        {assessor.notMet} NOT MET
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        N/A {assessor.notApplicable}
                      </Badge>
                    </div>

                    {/* Mini progress visualization: proportion of MET within assessed */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>MET rate</span>
                        <span>{assessorMetPct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all"
                          style={{ width: `${assessorMetPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
