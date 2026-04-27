'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import {
  deleteSavedViewAction,
  pinEngagement,
  removeEngagementTag,
  unpinEngagement,
} from '@/app/actions/c3pao-personal-views'
import { fromSavedViewFilter } from '@/lib/engagements-list/personal-filters'
import type {
  ActiveSnooze,
  EngagementTag,
  PhaseFilter,
  SavedView,
} from '@/lib/personal-views-types'

export interface UsePersonalViewsArgs {
  initialPinnedIds: string[]
  initialTagsByEngagement: Record<string, EngagementTag[]>
  initialAllTagLabels: string[]
  initialActiveSnoozes: ActiveSnooze[]
  initialSavedViews: SavedView[]
}

export interface PersonalViewsHandle {
  // Core triage state.
  phase: PhaseFilter
  setPhase: (next: PhaseFilter) => void
  mineOnly: boolean
  setMineOnly: (next: boolean) => void
  atRiskOnly: boolean
  setAtRiskOnly: (next: boolean) => void
  pinnedOnly: boolean
  setPinnedOnly: (next: boolean) => void
  hideSnoozed: boolean
  setHideSnoozed: (next: boolean) => void
  tagFilter: string[]
  setTagFilter: (next: string[]) => void
  activeSavedViewId: string | null
  setActiveSavedViewId: (next: string | null) => void

  // Persisted state mirrors.
  pinnedIds: Set<string>
  tagsByEngagement: Record<string, EngagementTag[]>
  snoozedIds: Set<string>
  savedViews: SavedView[]
  allTagLabels: string[]

  // Mutators.
  applySavedViewFilter: (id: string) => void
  togglePin: (id: string) => void
  removeTag: (id: string, label: string) => Promise<void>
  deleteSavedView: (id: string) => Promise<void>
  appendTag: (tag: EngagementTag) => void
  markSnoozed: (id: string) => void
  appendSavedView: (view: SavedView) => void
}

/** Aggregates personal-triage React state and the optimistic mutators. */
export function usePersonalViews({
  initialPinnedIds,
  initialTagsByEngagement,
  initialAllTagLabels,
  initialActiveSnoozes,
  initialSavedViews,
}: UsePersonalViewsArgs): PersonalViewsHandle {
  const [phase, setPhase] = useState<PhaseFilter>('all')
  const [mineOnly, setMineOnly] = useState(false)
  const [atRiskOnly, setAtRiskOnly] = useState(false)
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [hideSnoozed, setHideSnoozed] = useState(true)
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null)

  const [pinnedIds, setPinnedIds] = useState<Set<string>>(
    () => new Set(initialPinnedIds),
  )
  const [tagsByEngagement, setTagsByEngagement] = useState<
    Record<string, EngagementTag[]>
  >(initialTagsByEngagement)
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(
    () => new Set(initialActiveSnoozes.map((s) => s.engagementId)),
  )
  const [savedViews, setSavedViews] = useState<SavedView[]>(initialSavedViews)
  const [allTagLabels, setAllTagLabels] = useState<string[]>(initialAllTagLabels)

  const applySavedViewFilter = useCallback(
    (id: string) => {
      const view = savedViews.find((v) => v.id === id)
      if (!view) return
      const next = fromSavedViewFilter(view.filter)
      setPhase(next.phase)
      setMineOnly(next.mineOnly)
      setAtRiskOnly(next.atRiskOnly)
      setPinnedOnly(next.pinnedOnly)
      setHideSnoozed(next.hideSnoozed)
      setTagFilter(next.tagFilter)
      setActiveSavedViewId(id)
    },
    [savedViews],
  )

  const togglePin = useCallback(
    (id: string) => {
      const wasPinned = pinnedIds.has(id)
      setPinnedIds((prev) => {
        const next = new Set(prev)
        if (wasPinned) next.delete(id)
        else next.add(id)
        return next
      })
      const action = wasPinned ? unpinEngagement : pinEngagement
      action(id).then((result) => {
        if (!result.success) {
          setPinnedIds((prev) => {
            const next = new Set(prev)
            if (wasPinned) next.add(id)
            else next.delete(id)
            return next
          })
          toast.error(result.error || 'Failed to update pin')
        }
      })
    },
    [pinnedIds],
  )

  const removeTag = useCallback(async (id: string, label: string) => {
    const result = await removeEngagementTag(id, label)
    if (!result.success) {
      toast.error(result.error || 'Failed to remove tag')
      return
    }
    setTagsByEngagement((prev) => {
      const current = prev[id] ?? []
      const next = current.filter((t) => t.label !== label)
      const out: Record<string, EngagementTag[]> = { ...prev }
      if (next.length === 0) delete out[id]
      else out[id] = next
      return out
    })
  }, [])

  const deleteSavedView = useCallback(async (id: string) => {
    const result = await deleteSavedViewAction(id)
    if (!result.success) throw new Error(result.error || 'Failed to delete view')
    setSavedViews((prev) => prev.filter((v) => v.id !== id))
    setActiveSavedViewId((prev) => (prev === id ? null : prev))
  }, [])

  const appendTag = useCallback((tag: EngagementTag) => {
    setTagsByEngagement((prev) => ({
      ...prev,
      [tag.engagementId]: [...(prev[tag.engagementId] ?? []), tag],
    }))
    setAllTagLabels((prev) =>
      prev.includes(tag.label) ? prev : [...prev, tag.label].sort(),
    )
  }, [])

  const markSnoozed = useCallback((id: string) => {
    setSnoozedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const appendSavedView = useCallback((view: SavedView) => {
    setSavedViews((prev) => [view, ...prev])
    setActiveSavedViewId(view.id)
  }, [])

  return {
    phase,
    setPhase,
    mineOnly,
    setMineOnly,
    atRiskOnly,
    setAtRiskOnly,
    pinnedOnly,
    setPinnedOnly,
    hideSnoozed,
    setHideSnoozed,
    tagFilter,
    setTagFilter,
    activeSavedViewId,
    setActiveSavedViewId,
    pinnedIds,
    tagsByEngagement,
    snoozedIds,
    savedViews,
    allTagLabels,
    applySavedViewFilter,
    togglePin,
    removeTag,
    deleteSavedView,
    appendTag,
    markSnoozed,
    appendSavedView,
  }
}
