'use client'

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortKey, SortState } from '@/lib/engagements-list/sort'

interface SortableColumnHeaderProps {
  label: string
  sortKey: SortKey
  state: SortState
  onSort: (key: SortKey) => void
  className?: string
  align?: 'left' | 'right'
}

export function SortableColumnHeader({
  label,
  sortKey,
  state,
  onSort,
  className,
  align = 'left',
}: SortableColumnHeaderProps) {
  const active = state.key === sortKey
  const Icon = !active ? ArrowUpDown : state.direction === 'asc' ? ArrowUp : ArrowDown

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        align === 'right' && 'flex-row-reverse',
        className,
      )}
      aria-label={`Sort by ${label}${active ? `, currently ${state.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
    >
      <span>{label}</span>
      <Icon className="h-3 w-3" aria-hidden="true" />
    </button>
  )
}
