'use client'

import {
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  Target,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FindingsSummaryProps {
  stats: {
    totalControls: number
    assessed: number
    met: number
    notMet: number
    notApplicable: number
    notAssessed: number
    progressPercentage: number
  }
  riskBreakdown?: {
    critical: number
    high: number
    moderate: number
    low: number
  }
  className?: string
  compact?: boolean
}

export function FindingsSummary({
  stats,
  riskBreakdown,
  className,
  compact = false,
}: FindingsSummaryProps) {
  const cards = [
    {
      label: 'Total Controls',
      value: stats.totalControls,
      icon: Target,
      color: 'text-gray-600 dark:text-gray-300',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
    },
    {
      label: 'Assessed',
      value: stats.assessed,
      subtext: `${stats.progressPercentage}%`,
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'MET',
      value: stats.met,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'NOT MET',
      value: stats.notMet,
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      label: 'N/A',
      value: stats.notApplicable,
      icon: MinusCircle,
      color: 'text-gray-500 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-700',
    },
  ]

  if (compact) {
    return (
      <div className={cn('grid grid-cols-5 gap-3', className)}>
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col items-center p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
          >
            <card.icon className={cn('h-5 w-5 mb-1', card.color)} />
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {card.value}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {card.label}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Main stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={cn(
              'relative overflow-hidden rounded-xl p-4',
              card.bgColor
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {card.label}
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className={cn('text-3xl font-bold', card.color)}>
                    {card.value}
                  </p>
                  {card.subtext && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {card.subtext}
                    </span>
                  )}
                </div>
              </div>
              <card.icon className={cn('h-8 w-8 opacity-50', card.color)} />
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Assessment Progress
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {stats.progressPercentage}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full flex">
            {/* MET portion (green) */}
            <div
              className="bg-green-500 transition-all duration-500"
              style={{
                width: `${(stats.met / stats.totalControls) * 100}%`,
              }}
            />
            {/* NOT MET portion (red) */}
            <div
              className="bg-red-500 transition-all duration-500"
              style={{
                width: `${(stats.notMet / stats.totalControls) * 100}%`,
              }}
            />
            {/* N/A portion (gray) */}
            <div
              className="bg-gray-400 transition-all duration-500"
              style={{
                width: `${(stats.notApplicable / stats.totalControls) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">MET</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">NOT MET</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">N/A</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-gray-200 dark:bg-gray-600" />
            <span className="text-gray-600 dark:text-gray-400">Pending</span>
          </div>
        </div>
      </div>

      {/* Risk breakdown (if provided and has NOT_MET findings) */}
      {riskBreakdown && stats.notMet > 0 && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h4 className="font-medium text-red-900 dark:text-red-200">
              Deficiency Risk Breakdown
            </h4>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <RiskCard
              label="Critical"
              count={riskBreakdown.critical}
              color="bg-red-600"
            />
            <RiskCard
              label="High"
              count={riskBreakdown.high}
              color="bg-orange-500"
            />
            <RiskCard
              label="Moderate"
              count={riskBreakdown.moderate}
              color="bg-yellow-500"
            />
            <RiskCard
              label="Low"
              count={riskBreakdown.low}
              color="bg-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function RiskCard({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: string
}) {
  return (
    <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg">
      <div className="flex items-center justify-center gap-2">
        <div className={cn('h-3 w-3 rounded-full', color)} />
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {count}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  )
}

// Progress by family component
export function FamilyProgressChart({
  families,
  className,
}: {
  families: Array<{
    code: string
    name: string
    met: number
    notMet: number
    notApplicable: number
  }>
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {families.map((family) => {
        const total = family.met + family.notMet + family.notApplicable
        if (total === 0) return null

        const metPct = (family.met / total) * 100
        const notMetPct = (family.notMet / total) * 100
        const naPct = (family.notApplicable / total) * 100

        return (
          <div key={family.code}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {family.code}: {family.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {family.met}/{total} MET
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${metPct}%` }}
              />
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${notMetPct}%` }}
              />
              <div
                className="bg-gray-400 transition-all"
                style={{ width: `${naPct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
