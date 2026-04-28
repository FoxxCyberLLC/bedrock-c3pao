'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody } from '@/components/ui/table'
import { bulkUpdateLead } from '@/app/actions/c3pao-portfolio'
import {
  groupItems,
  type GroupKey,
} from '@/lib/engagements-list/saved-views'
import {
  applyPersonalFilters,
  hasNonDefaultFilters,
  summarizeFilters,
  toSavedViewFilter,
  type PersonalFilterState,
} from '@/lib/engagements-list/personal-filters'
import { resolvePhase } from '@/lib/portfolio/derive-risk'
import {
  sortItems,
  toggleSort,
  type SortKey,
  type SortState,
} from '@/lib/engagements-list/sort'
import type { PortfolioRow } from '@/lib/engagements-list/types'
import type {
  ActiveSnooze,
  EngagementTag,
  PhaseFilter,
  SavedView,
} from '@/lib/personal-views-types'
import { AddTagDialog } from './add-tag-dialog'
import { BulkActionsBar } from './bulk-actions-bar'
import { EngagementsGroupSection } from './engagements-group-section'
import { EngagementsTableHeader } from './engagements-table-header'
import { EngagementsToolbar } from './engagements-toolbar'
import { SaveViewDialog } from './save-view-dialog'
import { SnoozeDialog } from './snooze-dialog'
import { usePersonalViews } from './use-personal-views'

interface EngagementsListProps {
  initialItems: PortfolioRow[]
  currentUserId: string
  leadOptions: ReadonlyArray<readonly [string, string]>
  initialLeadFilterId?: string
  initialLeadFilterName?: string
  initialPinnedIds: string[]
  initialTagsByEngagement: Record<string, EngagementTag[]>
  initialAllTagLabels: string[]
  initialActiveSnoozes: ActiveSnooze[]
  initialSavedViews: SavedView[]
}

const COLLAPSED_KEY_PREFIX = 'c3pao-engagements-group-collapsed:'
const COLUMN_COUNT = 8

export function EngagementsList({
  initialItems,
  currentUserId,
  leadOptions,
  initialLeadFilterId,
  initialLeadFilterName,
  initialPinnedIds,
  initialTagsByEngagement,
  initialAllTagLabels,
  initialActiveSnoozes,
  initialSavedViews,
}: EngagementsListProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const personal = usePersonalViews({
    initialPinnedIds,
    initialTagsByEngagement,
    initialAllTagLabels,
    initialActiveSnoozes,
    initialSavedViews,
  })

  const [items, setItems] = useState<PortfolioRow[]>(initialItems)
  const [search, setSearch] = useState('')
  const [groupKey, setGroupKey] = useState<GroupKey>('none')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLeadId, setBulkLeadId] = useState<string>('')
  const [leadFilterId, setLeadFilterId] = useState<string | undefined>(
    initialLeadFilterId,
  )
  const [leadFilterName, setLeadFilterName] = useState<string | undefined>(
    initialLeadFilterName,
  )
  const [sort, setSort] = useState<SortState>({
    key: 'organization',
    direction: 'asc',
  })

  const [addTagFor, setAddTagFor] = useState<{ id: string } | null>(null)
  const [snoozeFor, setSnoozeFor] = useState<{ id: string; label: string } | null>(
    null,
  )
  const [showSaveViewDialog, setShowSaveViewDialog] = useState(false)

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

  const filterState: PersonalFilterState = useMemo(
    () => ({
      phase: personal.phase,
      mineOnly: personal.mineOnly,
      atRiskOnly: personal.atRiskOnly,
      pinnedOnly: personal.pinnedOnly,
      hideSnoozed: personal.hideSnoozed,
      tagFilter: personal.tagFilter,
      kindFilter: personal.kindFilter,
      leadFilterId,
    }),
    [
      personal.phase,
      personal.mineOnly,
      personal.atRiskOnly,
      personal.pinnedOnly,
      personal.hideSnoozed,
      personal.tagFilter,
      personal.kindFilter,
      leadFilterId,
    ],
  )

  const personalFiltered = useMemo(
    () =>
      applyPersonalFilters(items, filterState, {
        currentUserId,
        pinnedIds: personal.pinnedIds,
        snoozedIds: personal.snoozedIds,
        tagsByEngagement: personal.tagsByEngagement,
      }),
    [
      items,
      filterState,
      currentUserId,
      personal.pinnedIds,
      personal.snoozedIds,
      personal.tagsByEngagement,
    ],
  )

  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return personalFiltered
    return personalFiltered.filter(
      (item) =>
        item.organizationName.toLowerCase().includes(q) ||
        item.packageName.toLowerCase().includes(q),
    )
  }, [personalFiltered, search])

  const sorted = useMemo(
    () => sortItems(searchFiltered, sort),
    [searchFiltered, sort],
  )
  const groups = useMemo(() => groupItems(sorted, groupKey), [sorted, groupKey])
  const allVisibleIds = useMemo(() => sorted.map((i) => i.id), [sorted])

  const phaseCounts = useMemo<Partial<Record<PhaseFilter, number>>>(() => {
    const baseState: PersonalFilterState = { ...filterState, phase: 'all' }
    const base = applyPersonalFilters(items, baseState, {
      currentUserId,
      pinnedIds: personal.pinnedIds,
      snoozedIds: personal.snoozedIds,
      tagsByEngagement: personal.tagsByEngagement,
    })
    const counts: Partial<Record<PhaseFilter, number>> = { all: base.length }
    for (const item of base) {
      const p = resolvePhase(item)
      if (!p) continue
      counts[p] = (counts[p] ?? 0) + 1
    }
    return counts
  }, [
    items,
    filterState,
    currentUserId,
    personal.pinnedIds,
    personal.snoozedIds,
    personal.tagsByEngagement,
  ])

  const handleClearLeadFilter = useCallback(() => {
    setLeadFilterId(undefined)
    setLeadFilterName(undefined)
    router.replace('/engagements')
  }, [router])

  const handleSelectSavedView = useCallback(
    (id: string | null) => {
      if (id === null) personal.setActiveSavedViewId(null)
      else personal.applySavedViewFilter(id)
    },
    [personal],
  )

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

  // Wrap mutators that should clear the active saved view (since the user
  // just edited the filter manually).
  const onPhaseChange = useCallback(
    (next: PhaseFilter) => {
      personal.setPhase(next)
      personal.setActiveSavedViewId(null)
    },
    [personal],
  )
  const onMineOnlyChange = useCallback(
    (v: boolean) => {
      personal.setMineOnly(v)
      personal.setActiveSavedViewId(null)
    },
    [personal],
  )
  const onAtRiskOnlyChange = useCallback(
    (v: boolean) => {
      personal.setAtRiskOnly(v)
      personal.setActiveSavedViewId(null)
    },
    [personal],
  )
  const onPinnedOnlyChange = useCallback(
    (v: boolean) => {
      personal.setPinnedOnly(v)
      personal.setActiveSavedViewId(null)
    },
    [personal],
  )
  const onHideSnoozedChange = useCallback(
    (v: boolean) => {
      personal.setHideSnoozed(v)
      personal.setActiveSavedViewId(null)
    },
    [personal],
  )
  const onTagFilterChange = useCallback(
    (next: string[]) => {
      personal.setTagFilter(next)
      personal.setActiveSavedViewId(null)
    },
    [personal],
  )

  const allSelected =
    allVisibleIds.length > 0 && selected.size === allVisibleIds.length
  const someSelected = selected.size > 0 && !allSelected
  const canSaveCurrent = hasNonDefaultFilters(filterState)
  const filterSummary = useMemo(
    () => summarizeFilters(filterState),
    [filterState],
  )

  return (
    <div className="space-y-4">
      <EngagementsToolbar
        phase={personal.phase}
        onPhaseChange={onPhaseChange}
        phaseCounts={phaseCounts}
        mineOnly={personal.mineOnly}
        atRiskOnly={personal.atRiskOnly}
        pinnedOnly={personal.pinnedOnly}
        hideSnoozed={personal.hideSnoozed}
        onMineOnlyChange={onMineOnlyChange}
        onAtRiskOnlyChange={onAtRiskOnlyChange}
        onPinnedOnlyChange={onPinnedOnlyChange}
        onHideSnoozedChange={onHideSnoozedChange}
        kindFilter={personal.kindFilter}
        onKindFilterChange={(next) => {
          personal.setKindFilter(next)
          personal.setActiveSavedViewId(null)
        }}
        allTagLabels={personal.allTagLabels}
        tagFilter={personal.tagFilter}
        onTagFilterChange={onTagFilterChange}
        search={search}
        onSearchChange={setSearch}
        groupKey={groupKey}
        onGroupKeyChange={setGroupKey}
        shownCount={sorted.length}
        savedViews={personal.savedViews}
        activeSavedViewId={personal.activeSavedViewId}
        onSelectSavedView={handleSelectSavedView}
        onDeleteSavedView={personal.deleteSavedView}
        canSaveCurrent={canSaveCurrent}
        onOpenSaveView={() => setShowSaveViewDialog(true)}
      />

      {leadFilterId && (
        <div className="flex flex-wrap items-center gap-2">
          <span
            data-testid="lead-filter-chip"
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            <span>
              Filtered by lead:{' '}
              <span className="font-semibold">
                {leadFilterName ?? leadFilterId}
              </span>
            </span>
            <button
              type="button"
              onClick={handleClearLeadFilter}
              aria-label="Clear lead filter"
              className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}

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
                    <EngagementsGroupSection
                      key={group.key || 'all'}
                      group={group}
                      grouped={groupKey !== 'none'}
                      collapsed={collapsed}
                      columnCount={COLUMN_COUNT}
                      onToggleCollapse={handleToggleCollapse}
                      selected={selected}
                      onToggleSelect={handleToggleSelect}
                      pinnedIds={personal.pinnedIds}
                      tagsByEngagement={personal.tagsByEngagement}
                      snoozedIds={personal.snoozedIds}
                      onTogglePin={personal.togglePin}
                      onOpenAddTag={(id) => setAddTagFor({ id })}
                      onOpenSnooze={(id, label) => setSnoozeFor({ id, label })}
                      onRemoveTag={personal.removeTag}
                    />
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {addTagFor && (
        <AddTagDialog
          open
          onOpenChange={(o) => !o && setAddTagFor(null)}
          engagementId={addTagFor.id}
          suggestions={personal.allTagLabels}
          onSuccess={(tag) => {
            personal.appendTag(tag)
            setAddTagFor(null)
          }}
        />
      )}
      {snoozeFor && (
        <SnoozeDialog
          open
          onOpenChange={(o) => !o && setSnoozeFor(null)}
          engagementId={snoozeFor.id}
          engagementLabel={snoozeFor.label}
          onSuccess={() => {
            personal.markSnoozed(snoozeFor.id)
            setSnoozeFor(null)
          }}
        />
      )}
      {showSaveViewDialog && (
        <SaveViewDialog
          open
          onOpenChange={(o) => !o && setShowSaveViewDialog(false)}
          currentFilter={toSavedViewFilter(filterState)}
          filterSummary={filterSummary}
          onSuccess={(view) => {
            personal.appendSavedView(view)
            setShowSaveViewDialog(false)
          }}
        />
      )}
    </div>
  )
}
