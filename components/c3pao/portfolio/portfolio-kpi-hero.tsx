'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  Briefcase,
  CalendarCheck,
  CheckSquare,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { PortfolioStats } from '@/lib/api-client'

interface KpiCard {
  label: string
  value: number
  href: string
  icon: LucideIcon
  iconClass: string
  subtitle?: string
}

interface PortfolioKpiHeroProps {
  stats: PortfolioStats
}

/**
 * Lead-assessor dashboard KPI hero: 6 clickable cards summarizing the
 * portfolio state at a glance. Clicking a card navigates to a filtered
 * view of the relevant surface (engagements list, QA queue, certs, etc.).
 */
export function PortfolioKpiHero({ stats }: PortfolioKpiHeroProps) {
  const cards: KpiCard[] = [
    {
      label: 'Active',
      value: stats.activeCount,
      href: '/engagements?view=my-active',
      icon: Briefcase,
      iconClass: 'text-primary bg-primary/10',
      subtitle: 'Open engagements',
    },
    {
      label: 'At Risk',
      value: stats.atRiskCount,
      href: '/engagements?view=at-risk',
      icon: AlertTriangle,
      iconClass: 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-950/40',
      subtitle: 'Past due or stalled',
    },
    {
      label: 'Pre-Brief This Week',
      value: stats.preBriefThisWeek,
      href: '/calendar',
      icon: CalendarCheck,
      iconClass: 'text-sky-700 bg-sky-100 dark:text-sky-300 dark:bg-sky-950/40',
      subtitle: 'Starting in 7 days',
    },
    {
      label: 'QA Due',
      value: stats.qaDueCount,
      href: '/qa',
      icon: CheckSquare,
      iconClass: 'text-violet-700 bg-violet-100 dark:text-violet-300 dark:bg-violet-950/40',
      subtitle: 'Awaiting review',
    },
    {
      label: 'Certs ≤30 days',
      value: stats.certsExpiring30d,
      href: '/certificates',
      icon: ShieldCheck,
      iconClass: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/40',
      subtitle: 'Expiring soon',
    },
    {
      label: 'POA&M Closeouts',
      value: stats.poamCloseoutsDue,
      href: '/certificates',
      icon: ShieldAlert,
      iconClass: 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-950/40',
      subtitle: 'Due in 30 days',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Link
            key={card.label}
            href={card.href}
            className="group"
            aria-label={`${card.label}: ${card.value}`}
          >
            <Card className="transition-colors group-hover:border-primary/40 group-hover:shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                  <div
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-md',
                      card.iconClass,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {card.value}
                </div>
                {card.subtitle && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {card.subtitle}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
