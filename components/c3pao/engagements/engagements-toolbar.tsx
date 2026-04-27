'use client'

import { Bookmark, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  GROUP_OPTIONS,
  type GroupKey,
} from '@/lib/engagements-list/saved-views'
import type {
  EngagementTag,
  PhaseFilter,
  SavedView,
} from '@/lib/personal-views-types'
import { ChipToggles } from './chip-toggles'
import { PhaseTabs } from './phase-tabs'
import { SavedViewsStrip } from './saved-views-strip'
import { TagFilterDropdown } from './tag-filter-dropdown'

interface EngagementsToolbarProps {
  // phase tabs
  phase: PhaseFilter
  onPhaseChange: (next: PhaseFilter) => void
  phaseCounts: Partial<Record<PhaseFilter, number>>

  // chip toggles
  mineOnly: boolean
  atRiskOnly: boolean
  pinnedOnly: boolean
  hideSnoozed: boolean
  onMineOnlyChange: (next: boolean) => void
  onAtRiskOnlyChange: (next: boolean) => void
  onPinnedOnlyChange: (next: boolean) => void
  onHideSnoozedChange: (next: boolean) => void

  // tags
  allTagLabels: string[]
  tagFilter: string[]
  onTagFilterChange: (next: string[]) => void

  // search + group + count
  search: string
  onSearchChange: (next: string) => void
  groupKey: GroupKey
  onGroupKeyChange: (next: GroupKey) => void
  shownCount: number

  // saved views
  savedViews: SavedView[]
  activeSavedViewId: string | null
  onSelectSavedView: (id: string | null) => void
  onDeleteSavedView: (id: string) => Promise<void>

  // save current filter
  canSaveCurrent: boolean
  onOpenSaveView: () => void

  /** Optional ambient maps — currently unused inside the toolbar but kept for symmetry. */
  tagsByEngagement?: Record<string, EngagementTag[]>
}

/**
 * Toolbar for the engagements list. Stacks the new phase tabs, search/group
 * row, chip toggles + tag filter + save-view button, and saved-views strip.
 * Stateless — every piece of UI state lives in the parent list component.
 */
export function EngagementsToolbar({
  phase,
  onPhaseChange,
  phaseCounts,
  mineOnly,
  atRiskOnly,
  pinnedOnly,
  hideSnoozed,
  onMineOnlyChange,
  onAtRiskOnlyChange,
  onPinnedOnlyChange,
  onHideSnoozedChange,
  allTagLabels,
  tagFilter,
  onTagFilterChange,
  search,
  onSearchChange,
  groupKey,
  onGroupKeyChange,
  shownCount,
  savedViews,
  activeSavedViewId,
  onSelectSavedView,
  onDeleteSavedView,
  canSaveCurrent,
  onOpenSaveView,
}: EngagementsToolbarProps) {
  return (
    <div className="space-y-3">
      <PhaseTabs value={phase} onChange={onPhaseChange} counts={phaseCounts} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search organization or package..."
            className="pl-9"
          />
        </div>
        <Select
          value={groupKey}
          onValueChange={(v) => onGroupKeyChange(v as GroupKey)}
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
        <span className="text-sm text-muted-foreground">{shownCount} shown</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ChipToggles
          mineOnly={mineOnly}
          atRiskOnly={atRiskOnly}
          pinnedOnly={pinnedOnly}
          hideSnoozed={hideSnoozed}
          onMineOnlyChange={onMineOnlyChange}
          onAtRiskOnlyChange={onAtRiskOnlyChange}
          onPinnedOnlyChange={onPinnedOnlyChange}
          onHideSnoozedChange={onHideSnoozedChange}
        />
        <TagFilterDropdown
          allLabels={allTagLabels}
          selected={tagFilter}
          onChange={onTagFilterChange}
        />
        {canSaveCurrent && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenSaveView}
            className="h-7 gap-1.5 px-2.5 text-xs"
          >
            <Bookmark className="h-3 w-3" aria-hidden="true" />
            <span>Save current filter</span>
          </Button>
        )}
      </div>

      {savedViews.length > 0 && (
        <SavedViewsStrip
          views={savedViews}
          activeViewId={activeSavedViewId}
          onSelect={onSelectSavedView}
          onDelete={onDeleteSavedView}
        />
      )}
    </div>
  )
}
