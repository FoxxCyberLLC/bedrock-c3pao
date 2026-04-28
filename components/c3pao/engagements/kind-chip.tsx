'use client'

import { Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KindFilter } from '@/lib/personal-views-types'

interface KindChipProps {
  value: KindFilter
  onChange: (next: KindFilter) => void
}

const NEXT: Record<KindFilter, KindFilter> = {
  all: 'osc',
  osc: 'outside',
  outside: 'all',
}

const LABEL: Record<KindFilter, string> = {
  all: 'All kinds',
  osc: 'OSC only',
  outside: 'Outside only',
}

/**
 * Tri-state engagement-kind filter chip. Cycles all → osc → outside → all
 * on click. The chip is "off" (outline style) only when value === 'all';
 * filtering states render solid to match the other chip toggles.
 */
export function KindChip({ value, onChange }: KindChipProps) {
  const filtering = value !== 'all'
  return (
    <button
      type="button"
      onClick={() => onChange(NEXT[value])}
      aria-pressed={filtering}
      aria-label={`Engagement kind filter: ${LABEL[value]}`}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors',
        filtering
          ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90'
          : 'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {filtering && <Layers className="h-3 w-3" aria-hidden="true" />}
      <span>{LABEL[value]}</span>
    </button>
  )
}
