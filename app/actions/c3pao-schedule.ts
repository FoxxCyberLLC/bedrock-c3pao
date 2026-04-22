'use server'

/**
 * Engagement schedule & logistics server actions.
 *
 * One-row-per-engagement schedule data. Any authenticated team member
 * may read the schedule; only the lead assessor may update it.
 */

import { revalidatePath } from 'next/cache'
import { requireAuth, requireLeadAssessor } from '@/lib/auth'
import {
  getSchedule,
  upsertSchedule,
  type EngagementSchedule,
} from '@/lib/db-schedule'

export interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

export type SchedulePatch = Partial<
  Omit<EngagementSchedule, 'engagementId' | 'updatedAt' | 'updatedBy'>
>

function revalidateEngagement(engagementId: string): void {
  try {
    revalidatePath(`/engagements/${engagementId}`)
  } catch {
    // No-op in unit-test contexts without a route.
  }
}

function errorEnvelope<T>(error: unknown, fallback: string): ActionResult<T> {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  }
}

/** Fetch the schedule row (or null if not yet populated). */
export async function getEngagementSchedule(
  engagementId: string,
): Promise<ActionResult<EngagementSchedule | null>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const schedule = await getSchedule(engagementId)
    return { success: true, data: schedule }
  } catch (error) {
    return errorEnvelope(error, 'Failed to load schedule')
  }
}

/** Lead-only: upsert the schedule row. Unspecified fields are preserved. */
export async function updateEngagementSchedule(
  engagementId: string,
  patch: SchedulePatch,
): Promise<ActionResult<EngagementSchedule>> {
  try {
    const { session, isLead, error } = await requireLeadAssessor(engagementId)
    if (!session) return { success: false, error: error ?? 'Unauthorized' }
    if (!isLead) return { success: false, error: 'Lead assessor required' }

    const actor = {
      id: session.c3paoUser.id,
      email: session.c3paoUser.email,
      name: session.c3paoUser.name,
    }
    const updated = await upsertSchedule({
      engagementId,
      actor,
      patch,
    })
    revalidateEngagement(engagementId)
    return { success: true, data: updated }
  } catch (error) {
    return errorEnvelope(error, 'Failed to update schedule')
  }
}
