/**
 * Phase-aware "what does an assessor need to know about THIS engagement
 * RIGHT NOW" projection. Surfaces the time-sensitive signal for each
 * lifecycle phase so the engagements table tells you where to act next
 * without opening every row.
 */

import type { PortfolioListItem } from '@/lib/api-client'
import { resolvePhase } from '@/lib/portfolio/derive-risk'

export type StatsTone = 'neutral' | 'info' | 'success' | 'warn' | 'danger'

export interface QuickStat {
  label: string
  value: string
  tone: StatsTone
  /** Optional secondary line, e.g. countdown. */
  detail?: string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function daysUntil(iso: string | null, now: Date): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  return Math.ceil((t - now.getTime()) / MS_PER_DAY)
}

function formatRelativeDays(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return 'in 1 day'
  if (days > 1) return `in ${days} days`
  if (days === -1) return '1 day overdue'
  return `${Math.abs(days)} days overdue`
}

function deadlineTone(days: number, warnThreshold = 14): StatsTone {
  if (days < 0) return 'danger'
  if (days <= warnThreshold) return 'warn'
  return 'info'
}

const RESULT_LABEL: Record<string, { label: string; tone: StatsTone }> = {
  FINAL_LEVEL_2: { label: 'Final Level 2', tone: 'success' },
  CONDITIONAL_LEVEL_2: { label: 'Conditional Level 2', tone: 'warn' },
  NO_CMMC_STATUS: { label: 'No CMMC Status', tone: 'danger' },
}

/**
 * Project a portfolio row into a single "what matters now" stat.
 *
 * The contract — every row gets exactly one stat, never null — makes the
 * column easy to render without conditional layout per row. Phases without
 * a dominant signal (PRE_ASSESS, ASSESS) fall back to scheduled milestones
 * so the cell never feels empty.
 */
export function getPackageQuickStat(
  item: PortfolioListItem,
  now: Date = new Date(),
): QuickStat {
  const phase = resolvePhase(item)

  // Terminal: completed engagements show the certificate outcome.
  if (item.status === 'COMPLETED') {
    const result = item.assessmentResult
      ? RESULT_LABEL[item.assessmentResult]
      : null
    if (result) {
      const expiry = daysUntil(item.certExpiresAt, now)
      const detail =
        expiry !== null
          ? expiry < 0
            ? 'cert expired'
            : `cert expires ${formatRelativeDays(expiry)}`
          : undefined
      return { label: 'Result', value: result.label, tone: result.tone, detail }
    }
    return { label: 'Result', value: 'Awaiting outcome', tone: 'neutral' }
  }

  if (item.status === 'CANCELLED') {
    return { label: 'Status', value: 'Cancelled', tone: 'neutral' }
  }

  if (phase === 'CLOSE_OUT') {
    const due = daysUntil(item.poamCloseoutDue, now)
    if (due !== null) {
      return {
        label: 'POA&M closeout',
        value: formatRelativeDays(due),
        tone: deadlineTone(due, 14),
      }
    }
    return { label: 'Phase', value: 'Close-out', tone: 'info' }
  }

  if (phase === 'REPORT') {
    if (item.status === 'PENDING_APPROVAL') {
      return { label: 'QA', value: 'Awaiting review', tone: 'warn' }
    }
    return { label: 'Phase', value: 'Drafting report', tone: 'info' }
  }

  if (phase === 'ASSESS') {
    if (item.objectivesTotal > 0) {
      const remaining = Math.max(
        0,
        item.objectivesTotal - item.objectivesAssessed,
      )
      return {
        label: 'Objectives left',
        value: remaining === 0 ? 'all assessed' : `${remaining} to go`,
        tone: remaining === 0 ? 'success' : 'info',
      }
    }
    return { label: 'Phase', value: 'Assessing', tone: 'info' }
  }

  // PRE_ASSESS or null phase — surface the scheduled kickoff.
  const startsIn = daysUntil(item.scheduledStartDate, now)
  if (startsIn !== null) {
    return {
      label: 'Pre-brief',
      value: formatRelativeDays(startsIn),
      tone: deadlineTone(startsIn, 7),
    }
  }
  return { label: 'Phase', value: 'Planning', tone: 'neutral' }
}

export const TONE_TEXT_CLASS: Record<StatsTone, string> = {
  neutral: 'text-muted-foreground',
  info: 'text-sky-700 dark:text-sky-300',
  success: 'text-emerald-700 dark:text-emerald-300',
  warn: 'text-amber-700 dark:text-amber-300',
  danger: 'text-rose-700 dark:text-rose-300',
}
