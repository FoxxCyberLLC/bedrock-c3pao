'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table'
import { bulkUpdateLead } from '@/app/actions/c3pao-portfolio'
import {
  SAVED_VIEWS,
  GROUP_OPTIONS,
  applySavedView,
  groupItems,
  type GroupKey,
  type SavedViewId,
} from '@/lib/engagements-list/saved-views'
import {
  sortItems,
  toggleSort,
  type SortKey,
  type SortState,
} from '@/lib/engagements-list/sort'
import type { PortfolioRow } from '@/lib/engagements-list/types'
import { BulkActionsBar } from './bulk-actions-bar'
import { EngagementTableRow } from './engagement-table-row'
import { EngagementsTableHeader } from './engagements-table-header'

interface EngagementsListProps {
  initialItems: PortfolioRow[]
  currentUserId: string
  leadOptions: ReadonlyArray<readonly [string, string]>
}

const COLLAPSED_KEY_PREFIX = 'c3pao-engagements-group-collapsed:'
const COLUMN_COUNT = 7

export function EngagementsList({
  initialItems,
  currentUserId,
  leadOptions,
}: EngagementsListProps) {
  const [isPending, startTransition] = useTransition()

  const [items, setItems] = useState<PortfolioRow[]>(initialItems)
  const [search, setSearch] = useState('')
  const [groupKey, setGroupKey] = useState<GroupKey>('none')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLeadId, setBulkLeadId] = useState<string>('')
  const [activeViewId, setActiveViewId] = useState<SavedViewId | null>(null)
  const [sort, setSort] = useState<SortState>({
    key: 'organization',
    direction: 'asc',
  })

  const [collapseVersion, setCollapseVersion] = useState(0)
  const collapsedGroups = useMemo<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY_PREFIX + groupKey)
      if (!raw) return new Set()
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? new Set(parsed) : new Set()
    } catch {
      return new Set()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKey, collapseVersion])

  const viewFiltered = useMemo(() => {
    if (!activeViewId) return items
    return applySavedView(items, activeViewId, {
      userId: currentUserId,
      now: new Date(),
    })
  }, [items, activeViewId, currentUserId])

  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return viewFiltered
    return viewFiltered.filter(
      (item) =>
        item.organizationName.toLowerCase().includes(q) ||
        item.packageName.toLowerCase().includes(q),
    )
  }, [viewFiltered, search])

  const sorted = useMemo(
    () => sortItems(searchFiltered, sort),
    [searchFiltered, sort],
  )

  const groups = useMemo(() => groupItems(sorted, groupKey), [sorted, groupKey])

  const allVisibleIds = useMemo(() => sorted.map((i) => i.id), [sorted])

  const handleSwitchView = useCallback((viewId: SavedViewId | null) => {
    setActiveViewId(viewId)
    setSelected(new Set())
  }, [])

  const handleToggleSelect = useCallback((id: string, isSelected: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (isSelected) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selected.size === allVisibleIds.length && allVisibleIds.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allVisibleIds))
    }
  }, [allVisibleIds, selected.size])

  const handleSort = useCallback((key: SortKey) => {
    setSort((prev) => toggleSort(prev, key))
  }, [])

  const handleToggleCollapse = useCallback(
    (key: string) => {
      if (typeof window === 'undefined') return
      try {
        const raw = localStorage.getItem(COLLAPSED_KEY_PREFIX + groupKey)
        const current: string[] = raw ? (JSON.parse(raw) as string[]) : []
        const next = new Set(current)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        localStorage.setItem(
          COLLAPSED_KEY_PREFIX + groupKey,
          JSON.stringify(Array.from(next)),
        )
        setCollapseVersion((v) => v + 1)
      } catch {
        // quota exceeded — ignore
      }
    },
    [groupKey],
  )

  const handleBulkAssignLead = useCallback(() => {
    if (!bulkLeadId || selected.size === 0) return
    const ids = Array.from(selected)
    startTransition(async () => {
      const result = await bulkUpdateLead(ids, bulkLeadId)
      if (result.error) {
        toast.error(`Bulk update failed: ${result.error}`)
        return
      }
      if (result.failed.length > 0) {
        toast.error(
          `${result.succeeded.length} updated, ${result.failed.length} failed`,
        )
      } else {
        toast.success(`${result.succeeded.length} engagements re-assigned`)
      }
      const newLeadName =
        leadOptions.find(([id]) => id === bulkLeadId)?.[1] ?? null
      setItems((prev) =>
        prev.map((item) =>
          result.succeeded.includes(item.id)
            ? {
                ...item,
                leadAssessorId: bulkLeadId,
                leadAssessorName: newLeadName,
              }
            : item,
        ),
      )
      setSelected(new Set())
      setBulkLeadId('')
    })
  }, [bulkLeadId, selected, leadOptions])

  const allSelected =
    allVisibleIds.length > 0 && selected.size === allVisibleIds.length
  const someSelected = selected.size > 0 && !allSelected

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={activeViewId === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSwitchView(null)}
        >
          All
        </Button>
        {SAVED_VIEWS.map((view) => (
          <Button
            key={view.id}
            type="button"
            variant={activeViewId === view.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSwitchView(view.id)}
            title={view.description}
          >
            {view.label}
          </Button>
        ))}
      </div>

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
        <Select
          value={groupKey}
          onValueChange={(v) => setGroupKey(v as GroupKey)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUP_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {sorted.length} shown
        </span>
      </div>

      <BulkActionsBar
        selectedCount={selected.size}
        bulkLeadId={bulkLeadId}
        onBulkLeadIdChange={setBulkLeadId}
        leadOptions={leadOptions}
        onAssign={handleBulkAssignLead}
        onClear={() => setSelected(new Set())}
        isPending={isPending}
      />

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No engagements match the current view.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <EngagementsTableHeader
                sort={sort}
                onSort={handleSort}
                selectAllState={
                  allSelected ? true : someSelected ? 'indeterminate' : false
                }
                onSelectAll={handleSelectAll}
              />
              <TableBody>
                {groups.map((group) => {
                  const collapsed =
                    groupKey !== 'none' && collapsedGroups.has(group.key)
                  return (
                    <GroupSection
                      key={group.key || 'all'}
                      group={group}
                      grouped={groupKey !== 'none'}
                      collapsed={collapsed}
                      onToggleCollapse={handleToggleCollapse}
                      selected={selected}
                      onToggleSelect={handleToggleSelect}
                    />
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface GroupSectionProps {
  group: { key: string; label: string; items: PortfolioRow[] }
  grouped: boolean
  collapsed: boolean
  onToggleCollapse: (key: string) => void
  selected: Set<string>
  onToggleSelect: (id: string, selected: boolean) => void
}

function GroupSection({
  group,
  grouped,
  collapsed,
  onToggleCollapse,
  selected,
  onToggleSelect,
}: GroupSectionProps) {
  return (
    <>
      {grouped && (
        <TableRow className="border-b bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={COLUMN_COUNT} className="py-1.5">
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
          />
        ))}
    </>
  )
}
