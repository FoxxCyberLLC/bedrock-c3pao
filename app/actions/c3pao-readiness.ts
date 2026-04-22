'use server'

/**
 * Pre-assessment readiness server actions.
 *
 * Read-side entry points for the readiness workspace: fetches the 8-item
 * checklist (seeded lazily on first read) and the engagement's audit log.
 * All data is local to the C3PAO Postgres instance.
 */

import { requireAuth } from '@/lib/auth'
import { ensureItemsSeeded, getItems } from '@/lib/db-readiness'
import { getAuditLog } from '@/lib/db-audit'
import type {
  AuditEntry,
  ReadinessChecklist,
} from '@/lib/readiness-types'

export interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Fetch the full readiness checklist for an engagement. Lazily seeds the
 * 8 item rows if they do not yet exist. Computes `completedCount` and
 * `canStart` flags.
 */
export async function getReadinessChecklist(
  engagementId: string,
): Promise<ActionResult<ReadinessChecklist>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    await ensureItemsSeeded(engagementId)
    const items = await getItems(engagementId)

    const completedCount = items.filter(
      (i) => i.status === 'complete' || i.status === 'waived',
    ).length

    const checklist: ReadinessChecklist = {
      engagementId,
      items,
      completedCount,
      totalCount: 8,
      canStart: completedCount === 8,
    }
    return { success: true, data: checklist }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to load readiness checklist',
    }
  }
}

/** Fetch recent audit log entries for the engagement (default 200). */
export async function getReadinessAuditLog(
  engagementId: string,
): Promise<ActionResult<AuditEntry[]>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const entries = await getAuditLog(engagementId, { limit: 200 })
    return { success: true, data: entries }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to load audit log',
    }
  }
}
