'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Search } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateEngagementStatus } from '@/app/actions/c3pao-dashboard'
import {
  BOARD_COLUMNS,
  filterByLead,
  filterByRisk,
  filterByText,
  groupByPhase,
  resolveDropTargetStatus,
} from '@/lib/board/group-by-phase'
import type { Phase } from '@/lib/portfolio/derive-risk'
import type { PortfolioListItem } from '@/lib/api-client'
import { EngagementCard } from './engagement-card'
import { PhaseColumn } from './phase-column'

interface PhaseBoardProps {
  initialItems: PortfolioListItem[]
  isLeadAssessor: boolean
}

/**
 * Kanban board by CAP phase. Lead assessors can drag cards between columns
 * to transition the engagement status; non-leads see a read-only board.
 *
 * Drag state is optimistic — the card moves locally first, then the Go
 * API call fires in the background. On error, the card snaps back to its
 * original column and a toast is shown.
 */
export function PhaseBoard({ initialItems, isLeadAssessor }: PhaseBoardProps) {
  const [items, setItems] = useState<PortfolioListItem[]>(initialItems)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [leadFilter, setLeadFilter] = useState<string>('ALL')
  const [riskFilter, setRiskFilter] = useState<boolean>(false)
  const [search, setSearch] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const leadOptions = useMemo(() => {
    const leads = new Map<string, string>()
    for (const item of items) {
      if (item.leadAssessorId && item.leadAssessorName) {
        leads.set(item.leadAssessorId, item.leadAssessorName)
      }
    }
    return Array.from(leads.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [items])

  const filteredItems = useMemo(() => {
    let out = items
    out = filterByLead(out, leadFilter === 'ALL' ? null : leadFilter)
    out = filterByRisk(out, riskFilter)
    out = filterByText(out, search)
    return out
  }, [items, leadFilter, riskFilter, search])

  const grouped = useMemo(() => groupByPhase(filteredItems), [filteredItems])
  const activeItem = activeId ? items.find((i) => i.id === activeId) ?? null : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)

    const { active, over } = event
    if (!over) return
    if (!isLeadAssessor) return

    const activeIdStr = String(active.id)
    const overId = String(over.id)

    // Over may be a card (other engagement id) or a column (phase id).
    // Resolve the target phase by checking the over's data.current.
    const targetPhase =
      (over.data.current?.phase as Phase | undefined) ??
      BOARD_COLUMNS.find((c) => c.id === overId)?.phase

    if (!targetPhase) return

    const draggedItem = items.find((i) => i.id === activeIdStr)
    if (!draggedItem) return

    const targetStatus = resolveDropTargetStatus(targetPhase)
    if (draggedItem.status === targetStatus) return

    // Optimistic update — the card jumps to the new column immediately.
    const originalStatus = draggedItem.status
    setItems((prev) =>
      prev.map((i) =>
        i.id === activeIdStr ? { ...i, status: targetStatus } : i,
      ),
    )

    try {
      const result = await updateEngagementStatus(activeIdStr, targetStatus)
      if (!result.success) {
        throw new Error(result.error || 'Status update failed')
      }
      toast.success(`Moved to ${targetPhase.replace('_', ' ')}`)
    } catch (err) {
      // Revert: snap card back to its original column and show a toast.
      setItems((prev) =>
        prev.map((i) =>
          i.id === activeIdStr ? { ...i, status: originalStatus } : i,
        ),
      )
      toast.error(
        err instanceof Error
          ? `Phase change failed: ${err.message}`
          : 'Phase change failed',
      )
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organization or package..."
            className="pl-9"
          />
        </div>

        <Select value={leadFilter} onValueChange={setLeadFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All leads" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All leads</SelectItem>
            <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
            {leadOptions.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="risk-filter"
            checked={riskFilter}
            onCheckedChange={setRiskFilter}
          />
          <Label htmlFor="risk-filter" className="cursor-pointer text-sm">
            At risk only
          </Label>
        </div>
      </div>

      {/* Board columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {BOARD_COLUMNS.map((column) => (
            <PhaseColumn
              key={column.id}
              column={column}
              items={grouped[column.phase]}
              isDraggable={isLeadAssessor}
            />
          ))}
        </div>

        <DragOverlay>
          {activeItem && (
            <EngagementCard
              item={activeItem}
              sortableId={activeItem.id}
              isDraggable
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
