'use client'

import { TrendingUp } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PortfolioThroughputSparklineProps {
  /** Oldest-first array of 8 weekly completion counts. */
  weeks: readonly number[]
}

/**
 * Compact 8-week throughput bar chart for the dashboard.
 *
 * Intentionally hand-rendered with CSS flex + divs rather than Recharts —
 * for a sparkline this small the overhead of a charting library is
 * overkill, and this keeps the bundle lean. If we outgrow this, swap in
 * Recharts <BarChart> later.
 */
export function PortfolioThroughputSparkline({
  weeks,
}: PortfolioThroughputSparklineProps) {
  const max = Math.max(...weeks, 1)
  const total = weeks.reduce((acc, n) => acc + n, 0)
  const recent4 = weeks.slice(-4).reduce((acc, n) => acc + n, 0)
  const prior4 = weeks.slice(0, 4).reduce((acc, n) => acc + n, 0)
  const delta = recent4 - prior4
  const deltaSign = delta > 0 ? '+' : delta < 0 ? '' : ''

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Throughput
        </CardTitle>
        <CardDescription>Completions in the last 8 weeks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-3">
          <div className="text-2xl font-semibold tabular-nums">{total}</div>
          <div
            className={
              delta > 0
                ? 'text-xs font-medium text-emerald-600 dark:text-emerald-400'
                : delta < 0
                  ? 'text-xs font-medium text-rose-600 dark:text-rose-400'
                  : 'text-xs font-medium text-muted-foreground'
            }
            aria-label={`${delta} change in last four weeks compared to prior four`}
          >
            {deltaSign}
            {delta} vs prior 4w
          </div>
        </div>
        <div
          className="mt-4 flex h-16 items-end gap-1.5"
          role="img"
          aria-label={`Weekly throughput sparkline: ${weeks.join(', ')}`}
        >
          {weeks.map((count, idx) => {
            const heightPct = Math.max(6, (count / max) * 100)
            return (
              <div
                key={idx}
                className="flex-1 rounded-sm bg-primary/20 transition-colors hover:bg-primary/30"
                style={{ height: `${heightPct}%` }}
                title={`Week ${idx + 1}: ${count}`}
              />
            )
          })}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>8w ago</span>
          <span>Now</span>
        </div>
      </CardContent>
    </Card>
  )
}
