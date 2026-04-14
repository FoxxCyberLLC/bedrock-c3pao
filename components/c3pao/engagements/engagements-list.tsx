'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { ChevronDown, ChevronRight, Loader2, Search, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
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
import { bulkUpdateLead } from '@/app/actions/c3pao-portfolio'
import {
  SAVED_VIEWS,
  GROUP_OPTIONS,
  applySavedView,
  groupItems,
  type GroupKey,
  type SavedViewId,
} from '@/lib/engagements-list/saved-views'
import type { PortfolioListItem } from '@/lib/api-client'
import { EngagementListRow } from './engagement-list-row'

interface EngagementsListProps {
  initialItems: PortfolioListItem[]
  currentUserId: string
  leadOptions: ReadonlyArray<readonly [string, string]>
}

const COLLAPSED_KEY_PREFIX = 'c3pao-engagements-group-collapsed:'

export function EngagementsList({
  initialItems,
  currentUserId,
  leadOptions,
}: EngagementsListProps) {
  const [isPending, startTransition] = useTransition()

  const [items, setItems] = useState<PortfolioListItem[]>(initialItems)
  const [search, setSearch] = useState('')
  const [groupKey, setGroupKey] = useState<GroupKey>('none')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLeadId, setBulkLeadId] = useState<string>('')
  const [activeViewId, setActiveViewId] = useState<SavedViewId | null>(null)

  // Collapse state is read from localStorage lazily per-groupKey change.
  // A single `collapseVersion` bumps on groupKey change to re-read storage
  // without triggering a setState inside useEffect (which React 19 flags).
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
    // collapseVersion forces re-read after a user toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKey, collapseVersion])

  // Derive the filtered + grouped items.
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

  const groups = useMemo(
    () => groupItems(searchFiltered, groupKey),
    [searchFiltered, groupKey],
  )

  const allVisibleIds = useMemo(
    () => searchFiltered.map((i) => i.id),
    [searchFiltered],
  )

  const handleSwitchView = useCallback(
    (viewId: SavedViewId | null) => {
      setActiveViewId(viewId)
      setSelected(new Set())
    },
    [],
  )

  const handleToggleSelect = useCallback((id: string, isSelected: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (isSelected) {
        next.add(id)
      } else {
        next.delete(id)
      }
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

  const handleToggleCollapse = useCallback(
    (key: string) => {
      if (typeof window === 'undefined') return
      // Mutate localStorage directly then bump the version so the
      // `collapsedGroups` memo re-reads storage on next render. This keeps
      // the toggle outside of a setState-in-effect cycle.
      try {
        const raw = localStorage.getItem(COLLAPSED_KEY_PREFIX + groupKey)
        const current: string[] = raw ? (JSON.parse(raw) as string[]) : []
        const next = new Set(current)
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
        }
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
      // Optimistically update locally — lead on each updated engagement.
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

  return (
    <div className="space-y-4">
      {/* Saved views tabs */}
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

      {/* Search + grouping */}
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{searchFiltered.length} shown</span>
          {allVisibleIds.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-7"
            >
              {selected.size === allVisibleIds.length
                ? 'Deselect all'
                : 'Select all'}
            </Button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-3 py-3">
            <Badge variant="default">{selected.size} selected</Badge>
            <div className="flex items-center gap-2">
              <Select value={bulkLeadId} onValueChange={setBulkLeadId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Re-assign lead to..." />
                </SelectTrigger>
                <SelectContent>
                  {leadOptions.map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                onClick={handleBulkAssignLead}
                disabled={!bulkLeadId || isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Re-assign
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Groups */}
      {searchFiltered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No engagements match the current view.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const collapsed = groupKey !== 'none' && collapsedGroups.has(group.key)
            return (
              <div key={group.key || 'all'} className="space-y-2">
                {groupKey !== 'none' && (
                  <button
                    type="button"
                    onClick={() => handleToggleCollapse(group.key)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent"
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
                )}
                {!collapsed && (
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <EngagementListRow
                        key={item.id}
                        item={item}
                        selected={selected.has(item.id)}
                        onToggleSelect={handleToggleSelect}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
