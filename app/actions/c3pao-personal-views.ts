'use server'

/**
 * Server actions for the C3PAO personal-triage layer:
 * pins, tags, snoozes, and saved filter views. All state is local to the
 * C3PAO Postgres — never round-tripped through the Go API.
 */

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import * as Pins from '@/lib/db-pins'
import * as Tags from '@/lib/db-tags'
import * as Snoozes from '@/lib/db-snoozes'
import * as SavedViews from '@/lib/db-saved-views'
import {
  TAG_COLORS,
  type ActiveSnooze,
  type EngagementTag,
  type SavedView,
  type SavedViewFilter,
  type TagColor,
} from '@/lib/personal-views-types'

interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

const TAG_LABEL_MAX_LENGTH = 40
const SAVED_VIEW_NAME_MAX_LENGTH = 60

function errorEnvelope<T>(error: unknown, fallback: string): ActionResult<T> {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  }
}

function safeRevalidate(): void {
  try {
    revalidatePath('/engagements')
  } catch {
    // revalidatePath is a noop in unit-test environments without route context.
  }
}

function isValidColor(color: string): color is TagColor {
  return (TAG_COLORS as ReadonlyArray<string>).includes(color)
}

// ============================================================================
// Pins
// ============================================================================

export async function listPinnedEngagementIds(): Promise<ActionResult<string[]>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const ids = await Pins.listPinnedIds(session.c3paoUser.id)
    return { success: true, data: ids }
  } catch (error) {
    return errorEnvelope(error, 'Failed to load pinned engagements')
  }
}

export async function pinEngagement(engagementId: string): Promise<ActionResult> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    await Pins.pin(session.c3paoUser.id, engagementId)
    safeRevalidate()
    return { success: true }
  } catch (error) {
    return errorEnvelope(error, 'Failed to pin engagement')
  }
}

export async function unpinEngagement(engagementId: string): Promise<ActionResult> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    await Pins.unpin(session.c3paoUser.id, engagementId)
    safeRevalidate()
    return { success: true }
  } catch (error) {
    return errorEnvelope(error, 'Failed to unpin engagement')
  }
}

// ============================================================================
// Tags
// ============================================================================

export async function listEngagementTagsByEngagement(): Promise<
  ActionResult<Record<string, EngagementTag[]>>
> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await Tags.listAllTagsByEngagement()
    return { success: true, data }
  } catch (error) {
    return errorEnvelope(error, 'Failed to load tags')
  }
}

export async function listAllTagLabels(): Promise<ActionResult<string[]>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const labels = await Tags.listAllLabels()
    return { success: true, data: labels }
  } catch (error) {
    return errorEnvelope(error, 'Failed to load tag labels')
  }
}

export async function addEngagementTag(
  engagementId: string,
  label: string,
  color: TagColor,
): Promise<ActionResult<EngagementTag>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const trimmed = (label ?? '').trim()
    if (trimmed.length === 0) return { success: false, error: 'Tag label is required' }
    if (trimmed.length > TAG_LABEL_MAX_LENGTH) {
      return { success: false, error: `Tag label must be ${TAG_LABEL_MAX_LENGTH} characters or fewer` }
    }
    if (!isValidColor(color)) return { success: false, error: 'Invalid color' }

    const tag = await Tags.addTag({
      engagementId,
      label: trimmed,
      color,
      createdBy: session.c3paoUser.id,
    })
    safeRevalidate()
    return { success: true, data: tag }
  } catch (error) {
    return errorEnvelope(error, 'Failed to add tag')
  }
}

export async function removeEngagementTag(
  engagementId: string,
  label: string,
): Promise<ActionResult> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    await Tags.removeTag(engagementId, label)
    safeRevalidate()
    return { success: true }
  } catch (error) {
    return errorEnvelope(error, 'Failed to remove tag')
  }
}

// ============================================================================
// Snoozes
// ============================================================================

export async function listActiveSnoozesAction(): Promise<ActionResult<ActiveSnooze[]>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const snoozes = await Snoozes.listActiveSnoozes(session.c3paoUser.id)
    return { success: true, data: snoozes }
  } catch (error) {
    return errorEnvelope(error, 'Failed to load snoozes')
  }
}

export async function snoozeEngagement(
  engagementId: string,
  hiddenUntilIso: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const hiddenUntil = new Date(hiddenUntilIso)
    if (Number.isNaN(hiddenUntil.getTime())) {
      return { success: false, error: 'Invalid snooze date' }
    }
    if (hiddenUntil.getTime() <= Date.now()) {
      return { success: false, error: 'Snooze date must be in the future' }
    }

    await Snoozes.snooze({
      userId: session.c3paoUser.id,
      engagementId,
      hiddenUntil,
      reason: reason ?? null,
    })
    safeRevalidate()
    return { success: true }
  } catch (error) {
    return errorEnvelope(error, 'Failed to snooze engagement')
  }
}

export async function unsnoozeEngagement(engagementId: string): Promise<ActionResult> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    await Snoozes.unsnooze(session.c3paoUser.id, engagementId)
    safeRevalidate()
    return { success: true }
  } catch (error) {
    return errorEnvelope(error, 'Failed to unsnooze engagement')
  }
}

// ============================================================================
// Saved views
// ============================================================================

export async function listSavedViewsAction(): Promise<ActionResult<SavedView[]>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const views = await SavedViews.listSavedViews(session.c3paoUser.id)
    return { success: true, data: views }
  } catch (error) {
    return errorEnvelope(error, 'Failed to load saved views')
  }
}

export async function createSavedViewAction(
  name: string,
  filter: SavedViewFilter,
): Promise<ActionResult<SavedView>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const trimmed = (name ?? '').trim()
    if (trimmed.length === 0) return { success: false, error: 'View name is required' }
    if (trimmed.length > SAVED_VIEW_NAME_MAX_LENGTH) {
      return {
        success: false,
        error: `View name must be ${SAVED_VIEW_NAME_MAX_LENGTH} characters or fewer`,
      }
    }

    const view = await SavedViews.createSavedView({
      userId: session.c3paoUser.id,
      name: trimmed,
      filter,
    })
    safeRevalidate()
    return { success: true, data: view }
  } catch (error) {
    return errorEnvelope(error, 'Failed to create saved view')
  }
}

export async function updateSavedViewAction(
  id: string,
  patch: Partial<{ name: string; filter: SavedViewFilter }>,
): Promise<ActionResult<SavedView>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const cleaned: Partial<{ name: string; filter: SavedViewFilter }> = {}
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim()
      if (trimmed.length === 0) return { success: false, error: 'View name is required' }
      if (trimmed.length > SAVED_VIEW_NAME_MAX_LENGTH) {
        return {
          success: false,
          error: `View name must be ${SAVED_VIEW_NAME_MAX_LENGTH} characters or fewer`,
        }
      }
      cleaned.name = trimmed
    }
    if (patch.filter !== undefined) {
      cleaned.filter = patch.filter
    }

    const view = await SavedViews.updateSavedView({
      id,
      userId: session.c3paoUser.id,
      patch: cleaned,
    })
    safeRevalidate()
    return { success: true, data: view }
  } catch (error) {
    return errorEnvelope(error, 'Failed to update saved view')
  }
}

export async function deleteSavedViewAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    await SavedViews.deleteSavedView(id, session.c3paoUser.id)
    safeRevalidate()
    return { success: true }
  } catch (error) {
    return errorEnvelope(error, 'Failed to delete saved view')
  }
}
