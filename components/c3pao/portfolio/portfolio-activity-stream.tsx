'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Activity } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { safeDate } from '@/lib/utils'
import type { PortfolioListItem } from '@/lib/api-client'

interface PortfolioActivityStreamProps {
  items: readonly PortfolioListItem[]
}

/**
 * Recent activity feed on the lead-assessor dashboard.
 *
 * For M2 this surfaces engagement updates sorted by `updatedAt`. Task 13b
 * replaces this with a merged feed that includes comments, mentions,
 * finding submissions, phase changes, and check-ins.
 */
export function PortfolioActivityStream({ items }: PortfolioActivityStreamProps) {
  const sorted = [...items]
    .sort(
      (a, b) =>
        (safeDate(b.updatedAt)?.getTime() ?? 0) -
        (safeDate(a.updatedAt)?.getTime() ?? 0),
    )
    .slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest engagement updates across the portfolio
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            No recent activity.
          </p>
        ) : (
          <ul className="divide-y">
            {sorted.map((item) => {
              const updated = safeDate(item.updatedAt)
              return (
                <li key={item.id}>
                  <Link
                    href={`/engagements/${item.id}`}
                    className="flex items-start gap-3 px-6 py-3 transition-colors hover:bg-accent"
                  >
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.packageName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.organizationName} · {item.status.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {updated
                        ? formatDistanceToNow(updated, { addSuffix: true })
                        : ''}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
