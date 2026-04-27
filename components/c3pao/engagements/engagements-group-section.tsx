'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'

import { TableCell, TableRow } from '@/components/ui/table'
import type { PortfolioRow } from '@/lib/engagements-list/types'
import type { EngagementTag } from '@/lib/personal-views-types'
import { EngagementTableRow } from './engagement-table-row'

interface EngagementsGroupSectionProps {
  group: { key: string; label: string; items: PortfolioRow[] }
  grouped: boolean
  collapsed: boolean
  columnCount: number
  onToggleCollapse: (key: string) => void
  selected: Set<string>
  onToggleSelect: (id: string, selected: boolean) => void
  pinnedIds: Set<string>
  tagsByEngagement: Record<string, EngagementTag[]>
  snoozedIds: Set<string>
  onTogglePin: (id: string) => void
  onOpenAddTag: (id: string) => void
  onOpenSnooze: (id: string, label: string) => void
  onRemoveTag: (id: string, label: string) => void
}

/**
 * Renders one collapsible group section in the engagements table — a header
 * row (when grouped) followed by the matching engagement rows. Extracted out
 * so the parent list component stays readable.
 */
export function EngagementsGroupSection({
  group,
  grouped,
  collapsed,
  columnCount,
  onToggleCollapse,
  selected,
  onToggleSelect,
  pinnedIds,
  tagsByEngagement,
  snoozedIds,
  onTogglePin,
  onOpenAddTag,
  onOpenSnooze,
  onRemoveTag,
}: EngagementsGroupSectionProps) {
  return (
    <>
      {grouped && (
        <TableRow className="border-b bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={columnCount} className="py-1.5">
            <button
              type="button"
              onClick={() => onToggleCollapse(group.key)}
              className="flex w-full items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
            >
              {collapsed ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              <span>{group.label}</span>
              <span className="ml-1 rounded-full bg-muted px-1.5 font-medium tabular-nums">
                {group.items.length}
              </span>
            </button>
          </TableCell>
        </TableRow>
      )}
      {!collapsed &&
        group.items.map((item) => (
          <EngagementTableRow
            key={item.id}
            item={item}
            selected={selected.has(item.id)}
            onToggleSelect={onToggleSelect}
            pinned={pinnedIds.has(item.id)}
            tags={tagsByEngagement[item.id] ?? []}
            snoozed={snoozedIds.has(item.id)}
            onTogglePin={onTogglePin}
            onOpenAddTag={onOpenAddTag}
            onOpenSnooze={onOpenSnooze}
            onRemoveTag={onRemoveTag}
          />
        ))}
    </>
  )
}
