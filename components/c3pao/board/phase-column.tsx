'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { cn } from '@/lib/utils'
import { EngagementCard } from './engagement-card'
import type { BoardColumn } from '@/lib/board/group-by-phase'
import type { PortfolioListItem } from '@/lib/api-client'

interface PhaseColumnProps {
  column: BoardColumn
  items: PortfolioListItem[]
  isDraggable: boolean
}

/**
 * A single kanban column for one CAP phase. Acts as a droppable target
 * (via @dnd-kit's useDroppable) and a sortable context for its cards.
 */
export function PhaseColumn({ column, items, isDraggable }: PhaseColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { phase: column.phase },
  })

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-2 pb-2">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {column.label}
          </h3>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
            {column.description}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
          {items.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 rounded-lg border-2 border-dashed p-2 transition-colors',
          isOver && isDraggable
            ? 'border-primary/60 bg-primary/5'
            : 'border-transparent bg-muted/30',
        )}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nothing in this phase
            </p>
          ) : (
            items.map((item) => (
              <EngagementCard
                key={item.id}
                item={item}
                sortableId={item.id}
                isDraggable={isDraggable}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}
