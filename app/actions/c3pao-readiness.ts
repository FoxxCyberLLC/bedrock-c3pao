'use server'

/**
 * Pre-assessment readiness server actions.
 *
 * Read-side entry points for the readiness workspace: fetches the 8-item
 * checklist (seeded lazily on first read) and the engagement's audit log.
 * All data is local to the C3PAO Postgres instance.
 */

import { revalidatePath } from 'next/cache'
import { requireAuth, requireLeadAssessor } from '@/lib/auth'
import {
  ensureItemsSeeded,
  getItems,
  markItemComplete,
  unmarkItemComplete,
  waiveItem,
  unwaiveItem,
} from '@/lib/db-readiness'
import { appendAudit, getAuditLog } from '@/lib/db-audit'
import { READINESS_ITEM_KEYS } from '@/lib/readiness-types'
import type {
  AuditEntry,
  ReadinessChecklist,
  ReadinessItem,
  ReadinessItemKey,
} from '@/lib/readiness-types'

const WAIVER_REASON_MIN_LENGTH = 20

function isValidItemKey(key: string): key is ReadinessItemKey {
  return (READINESS_ITEM_KEYS as readonly string[]).includes(key)
}

function revalidateEngagement(engagementId: string): void {
  try {
    revalidatePath(`/engagements/${engagementId}`)
  } catch {
    // revalidatePath is a noop in unit-test environments without a route
    // context — ignore so state actions remain testable.
  }
}

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

async function safeAppendAudit(
  params: Parameters<typeof appendAudit>[0],
): Promise<void> {
  try {
    await appendAudit(params)
  } catch (error) {
    // Audit failures must not abort user-visible mutations.
    console.error('[readiness] audit append failed', error)
  }
}

/** Lead-only: mark an item complete. */
export async function completeItem(
  engagementId: string,
  itemKey: ReadinessItemKey,
): Promise<ActionResult<ReadinessItem>> {
  try {
    if (!isValidItemKey(itemKey)) {
      return { success: false, error: 'Invalid item key' }
    }
    const { session, isLead, error } = await requireLeadAssessor(engagementId)
    if (!session) return { success: false, error: error ?? 'Unauthorized' }
    if (!isLead) return { success: false, error: 'Lead assessor required' }

    const actor = {
      id: session.c3paoUser.id,
      email: session.c3paoUser.email,
      name: session.c3paoUser.name,
    }
    const item = await markItemComplete(engagementId, itemKey, actor)
    await safeAppendAudit({
      engagementId,
      itemId: item.id,
      actor,
      action: 'item_completed',
      details: { itemKey, artifactCount: item.artifacts.length },
    })
    revalidateEngagement(engagementId)
    return { success: true, data: item }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to complete item',
    }
  }
}

/** Lead-only: clear a completion. Item drops to `in_progress` or `not_started`. */
export async function uncompleteItem(
  engagementId: string,
  itemKey: ReadinessItemKey,
): Promise<ActionResult<ReadinessItem>> {
  try {
    if (!isValidItemKey(itemKey)) {
      return { success: false, error: 'Invalid item key' }
    }
    const { session, isLead, error } = await requireLeadAssessor(engagementId)
    if (!session) return { success: false, error: error ?? 'Unauthorized' }
    if (!isLead) return { success: false, error: 'Lead assessor required' }

    const actor = {
      id: session.c3paoUser.id,
      email: session.c3paoUser.email,
      name: session.c3paoUser.name,
    }
    const item = await unmarkItemComplete(engagementId, itemKey)
    await safeAppendAudit({
      engagementId,
      itemId: item.id,
      actor,
      action: 'item_uncompleted',
      details: { itemKey },
    })
    revalidateEngagement(engagementId)
    return { success: true, data: item }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to re-open item',
    }
  }
}

/** Lead-only: waive an item with a required reason (≥ 20 chars). */
export async function grantWaiver(
  engagementId: string,
  itemKey: ReadinessItemKey,
  reason: string,
): Promise<ActionResult<ReadinessItem>> {
  try {
    if (!isValidItemKey(itemKey)) {
      return { success: false, error: 'Invalid item key' }
    }
    const trimmed = (reason ?? '').trim()
    if (trimmed.length < WAIVER_REASON_MIN_LENGTH) {
      return {
        success: false,
        error: `Waiver reason must be at least ${WAIVER_REASON_MIN_LENGTH} characters`,
      }
    }
    const { session, isLead, error } = await requireLeadAssessor(engagementId)
    if (!session) return { success: false, error: error ?? 'Unauthorized' }
    if (!isLead) return { success: false, error: 'Lead assessor required' }

    const actor = {
      id: session.c3paoUser.id,
      email: session.c3paoUser.email,
      name: session.c3paoUser.name,
    }
    const item = await waiveItem(engagementId, itemKey, trimmed, actor)
    await safeAppendAudit({
      engagementId,
      itemId: item.id,
      actor,
      action: 'waiver_granted',
      details: { itemKey, reason: trimmed },
    })
    revalidateEngagement(engagementId)
    return { success: true, data: item }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to grant waiver',
    }
  }
}

/** Lead-only: revoke a previously granted waiver. */
export async function revokeWaiver(
  engagementId: string,
  itemKey: ReadinessItemKey,
): Promise<ActionResult<ReadinessItem>> {
  try {
    if (!isValidItemKey(itemKey)) {
      return { success: false, error: 'Invalid item key' }
    }
    const { session, isLead, error } = await requireLeadAssessor(engagementId)
    if (!session) return { success: false, error: error ?? 'Unauthorized' }
    if (!isLead) return { success: false, error: 'Lead assessor required' }

    const actor = {
      id: session.c3paoUser.id,
      email: session.c3paoUser.email,
      name: session.c3paoUser.name,
    }
    const item = await unwaiveItem(engagementId, itemKey)
    await safeAppendAudit({
      engagementId,
      itemId: item.id,
      actor,
      action: 'waiver_revoked',
      details: { itemKey },
    })
    revalidateEngagement(engagementId)
    return { success: true, data: item }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to revoke waiver',
    }
  }
}
