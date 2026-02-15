'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileJson,
  Server,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Eye,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getSTIGTargets, getSTIGStatistics } from '@/app/actions/stig'
import type { STIGStatistics, STIGTargetWithStats } from '@/lib/stig/types'

interface STIGViewerProps {
  packageId: string
  engagementId: string
  assessmentModeActive?: boolean
}

export function STIGViewer({ packageId, engagementId, assessmentModeActive = false }: STIGViewerProps) {
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState<STIGStatistics | null>(null)
  const [targets, setTargets] = useState<STIGTargetWithStats[]>([])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [statsResult, targetsResult] = await Promise.all([
          getSTIGStatistics(packageId),
          getSTIGTargets(packageId),
        ])

        if (statsResult.success && statsResult.data) {
          setStatistics(statsResult.data)
        }
        if (targetsResult.success && targetsResult.data) {
          setTargets(targetsResult.data as any)
        }
      } catch (error) {
        console.error('Failed to load STIG data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [packageId])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading STIG data...</p>
        </CardContent>
      </Card>
    )
  }

  if (!statistics || statistics.totalRules === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileJson className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No STIG Data Available</h3>
          <p className="text-muted-foreground mt-1">
            {assessmentModeActive
              ? 'The OSC has not uploaded any STIG scan results for this package.'
              : 'STIG scan results will be accessible once the assessment begins.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getProgressClass = (percentage: number) => {
    if (percentage >= 80) return '[&>div]:bg-green-500'
    if (percentage >= 60) return '[&>div]:bg-yellow-500'
    return '[&>div]:bg-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Read-only notice */}
      <Alert>
        <Eye className="h-4 w-4" />
        <AlertDescription>
          Viewing OSC&apos;s STIG scan results. This data is read-only.
        </AlertDescription>
      </Alert>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getComplianceColor(statistics.compliancePercentage)}`}>
              {statistics.compliancePercentage}%
            </div>
            <Progress
              value={statistics.compliancePercentage}
              className={`h-2 mt-2 ${getProgressClass(statistics.compliancePercentage)}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Targets</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalTargets}</div>
            <p className="text-xs text-muted-foreground">Systems scanned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <FileJson className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalRules}</div>
            <p className="text-xs text-muted-foreground">Across all STIGs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Findings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statistics.byStatus.OPEN}</div>
            <p className="text-xs text-muted-foreground">Require remediation</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
          <CardDescription>Distribution of STIG rule statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm">Open</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{statistics.byStatus.OPEN}</span>
                <span className="text-xs text-muted-foreground">
                  ({((statistics.byStatus.OPEN / statistics.totalRules) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm">Not a Finding</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{statistics.byStatus.NOT_A_FINDING}</span>
                <span className="text-xs text-muted-foreground">
                  ({((statistics.byStatus.NOT_A_FINDING / statistics.totalRules) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-400" />
                <span className="text-sm">Not Applicable</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{statistics.byStatus.NOT_APPLICABLE}</span>
                <span className="text-xs text-muted-foreground">
                  ({((statistics.byStatus.NOT_APPLICABLE / statistics.totalRules) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="text-sm">Not Reviewed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{statistics.byStatus.NOT_REVIEWED}</span>
                <span className="text-xs text-muted-foreground">
                  ({((statistics.byStatus.NOT_REVIEWED / statistics.totalRules) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Targets Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Scanned Targets</CardTitle>
            <CardDescription>Systems with STIG scan results</CardDescription>
          </div>
          <Button asChild>
            <Link href={`/engagements/${engagementId}/stigs`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View All STIGs
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {targets.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No targets found</p>
          ) : (
            <div className="space-y-3">
              {targets.slice(0, 5).map((target) => (
                <div
                  key={target.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{target.hostname}</p>
                      <p className="text-xs text-muted-foreground">
                        {target.ipAddress || 'No IP'} &middot; {target.checklists?.length || 0} STIGs &middot; {target.totalRules} rules
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getComplianceColor(target.compliancePercentage)}`}>
                        {target.compliancePercentage}%
                      </div>
                      {target.openCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {target.openCount} open
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/engagements/${engagementId}/stigs/${target.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              {targets.length > 5 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  And {targets.length - 5} more targets...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
