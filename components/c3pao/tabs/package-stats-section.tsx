'use client'

import { TrendingUp, ShieldCheck, FileCheck, FolderOpen, FileJson, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface ControlStats {
  total: number
  compliant: number
  nonCompliant: number
  inProgress: number
  notStarted: number
  notApplicable: number
}

interface StigStats {
  targetsCount: number
  openCount: number
  compliancePercentage: number
}

interface PackageStatsSectionProps {
  controlStats: ControlStats
  evidenceCount: number
  assetCount: number
  stigStats?: StigStats | null
  /** DoD SPRS score (range -203..110) from the Go API. Undefined while loading. */
  sprsScore?: number
  /** DoD SPRS ceiling (110). Undefined while loading. */
  sprsMaxScore?: number
  /** Sum of points deducted from the SPRS ceiling. Undefined while loading. */
  pointsDeducted?: number
  /** Tracked load state for the SPRS API call so we can distinguish loading from a failed fetch. */
  sprsState?: 'loading' | 'ready' | 'error'
}

export function PackageStatsSection({
  controlStats,
  evidenceCount,
  assetCount,
  stigStats,
  sprsScore,
  sprsMaxScore,
  pointsDeducted,
  sprsState = 'loading',
}: PackageStatsSectionProps) {
  const hasSprs = sprsScore !== undefined && sprsMaxScore !== undefined
  const sprsPct = hasSprs && sprsMaxScore! > 0
    ? Math.max(0, Math.min(100, Math.round((sprsScore! / sprsMaxScore!) * 100)))
    : 0

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {/* SPRS Score (DoD NIST 800-171 Assessment Methodology v1.2.1) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SPRS Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-1">
              {hasSprs ? `${sprsScore} / ${sprsMaxScore}` : '—'}
            </div>
            <Progress value={sprsPct} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {hasSprs
                ? pointsDeducted === 0
                  ? 'No points deducted'
                  : `${pointsDeducted} ${pointsDeducted === 1 ? 'point' : 'points'} deducted`
                : sprsState === 'error'
                  ? 'Score unavailable — see console'
                  : 'Loading from API…'}
            </p>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requirements</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{controlStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Total CMMC objectives</p>
          </CardContent>
        </Card>

        {/* Met */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Met</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{controlStats.compliant}</div>
            <p className="text-xs text-muted-foreground mt-1">Objectives assessed MET</p>
          </CardContent>
        </Card>

        {/* Not Met */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Met</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{controlStats.nonCompliant}</div>
            <p className="text-xs text-muted-foreground mt-1">Objectives assessed NOT MET</p>
          </CardContent>
        </Card>

        {/* Evidence Files */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evidence</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-2">{evidenceCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Evidence files</p>
          </CardContent>
        </Card>

        {/* Assets or STIG */}
        {stigStats ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">STIG Compliance</CardTitle>
              {stigStats.openCount > 0 ? (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              ) : (
                <FileJson className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  stigStats.compliancePercentage >= 80
                    ? 'text-green-600'
                    : stigStats.compliancePercentage >= 60
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {stigStats.compliancePercentage}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stigStats.openCount > 0 ? (
                  <span className="text-red-600">{stigStats.openCount} open findings</span>
                ) : (
                  `${stigStats.targetsCount} targets scanned`
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assets</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-3">{assetCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Inventory items tracked</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
