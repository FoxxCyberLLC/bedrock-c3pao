/** STUB — replaced by Agent A's data layer at merge time. */
/* eslint-disable @typescript-eslint/no-unused-vars */

'use server'

/**
 * Server actions for engagement personal-views power tools (tags, snoozes,
 * saved views). This stub provides the type contract only — the real
 * implementation is delivered by the data-layer agent in a parallel branch.
 */

import type {
  EngagementTag,
  SavedView,
  SavedViewFilter,
  TagColor,
} from '@/lib/personal-views-types'

interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export async function addEngagementTag(
  _engagementId: string,
  _label: string,
  _color: TagColor,
): Promise<ActionResult<EngagementTag>> {
  return { success: false, error: 'stub' }
}

export async function removeEngagementTag(
  _engagementId: string,
  _label: string,
): Promise<ActionResult> {
  return { success: false, error: 'stub' }
}

export async function listAllTagLabels(): Promise<ActionResult<string[]>> {
  return { success: false, error: 'stub' }
}

export async function snoozeEngagement(
  _engagementId: string,
  _hiddenUntilIso: string,
  _reason?: string,
): Promise<ActionResult> {
  return { success: false, error: 'stub' }
}

export async function unsnoozeEngagement(
  _engagementId: string,
): Promise<ActionResult> {
  return { success: false, error: 'stub' }
}

export async function createSavedViewAction(
  _name: string,
  _filter: SavedViewFilter,
): Promise<ActionResult<SavedView>> {
  return { success: false, error: 'stub' }
}

export async function deleteSavedViewAction(
  _id: string,
): Promise<ActionResult> {
  return { success: false, error: 'stub' }
}

export async function updateSavedViewAction(
  _id: string,
  _patch: Partial<{ name: string; filter: SavedViewFilter }>,
): Promise<ActionResult<SavedView>> {
  return { success: false, error: 'stub' }
}
