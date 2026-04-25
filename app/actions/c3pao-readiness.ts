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
import {
  fetchEngagementPhase,
  updateEngagementPhase,
  fetchEngagementDetail,
  updateEngagementStatus as apiUpdateEngagementStatus,
  toggleAssessmentMode,
} from '@/lib/api-client'
import { attestFormQad, revokeFormQad, formQadStep } from '@/lib/qa-self-attest'
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

interface LeadContext {
  // Narrowed to non-null — resolveLead returns ok:false if session is null.
  session: NonNullable<Awaited<ReturnType<typeof requireLeadAssessor>>['session']>
  actor: { id: string; email: string; name: string }
}

async function resolveLead(
  engagementId: string,
): Promise<
  | { ok: true; ctx: LeadContext }
  | { ok: false; response: ActionResult<never> }
> {
  const { session, isLead, error } = await requireLeadAssessor(engagementId)
  if (!session) {
    return { ok: false, response: { success: false, error: error ?? 'Unauthorized' } }
  }
  if (!isLead) {
    return { ok: false, response: { success: false, error: 'Lead assessor required' } }
  }
  return {
    ok: true,
    ctx: {
      session,
      actor: {
        id: session.c3paoUser.id,
        email: session.c3paoUser.email,
        name: session.c3paoUser.name,
      },
    },
  }
}

function errorEnvelope<T>(error: unknown, fallback: string): ActionResult<T> {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  }
}

async function safeRollback(fn: () => Promise<unknown>, label: string): Promise<void> {
  try { await fn() } catch (e) { console.error(`[readiness] startAssessment rollback (${label}) failed`, e) }
}

/** Lead-only: mark an item complete. */
export async function completeItem(
  engagementId: string,
  itemKey: ReadinessItemKey,
): Promise<ActionResult<ReadinessItem>> {
  try {
    if (!isValidItemKey(itemKey)) return { success: false, error: 'Invalid item key' }
    const lead = await resolveLead(engagementId)
    if (!lead.ok) return lead.response

    const item = await markItemComplete(engagementId, itemKey, lead.ctx.actor)
    if (itemKey === 'form_qad') {
      const r = await formQadStep({
        attempt: () => attestFormQad(engagementId, lead.ctx.actor.id, lead.ctx.session.apiToken),
        rollback: () => unmarkItemComplete(engagementId, itemKey),
        label: 'attest', engagementId, itemId: item.id, actor: lead.ctx.actor,
        audit: safeAppendAudit,
      })
      if (!r.success) return { success: false, error: r.error }
    }
    await safeAppendAudit({
      engagementId, itemId: item.id, actor: lead.ctx.actor,
      action: 'item_completed',
      details: { itemKey, artifactCount: item.artifacts.length },
    })
    revalidateEngagement(engagementId)
    return { success: true, data: item }
  } catch (error) {
    return errorEnvelope(error, 'Failed to complete item')
  }
}

/** Lead-only: clear a completion. Item drops to `in_progress` or `not_started`. */
export async function uncompleteItem(
  engagementId: string,
  itemKey: ReadinessItemKey,
): Promise<ActionResult<ReadinessItem>> {
  try {
    if (!isValidItemKey(itemKey)) return { success: false, error: 'Invalid item key' }
    const lead = await resolveLead(engagementId)
    if (!lead.ok) return lead.response

    const item = await unmarkItemComplete(engagementId, itemKey)
    if (itemKey === 'form_qad') {
      const r = await formQadStep({
        attempt: () => revokeFormQad(engagementId, lead.ctx.session.apiToken),
        rollback: () => markItemComplete(engagementId, itemKey, lead.ctx.actor),
        label: 'revoke', engagementId, itemId: item.id, actor: lead.ctx.actor,
        audit: safeAppendAudit,
      })
      if (!r.success) return { success: false, error: r.error }
    }
    await safeAppendAudit({
      engagementId, itemId: item.id, actor: lead.ctx.actor,
      action: 'item_uncompleted', details: { itemKey },
    })
    revalidateEngagement(engagementId)
    return { success: true, data: item }
  } catch (error) {
    return errorEnvelope(error, 'Failed to re-open item')
  }
}

/** Lead-only: waive an item with a required reason (≥ 20 chars). */
export async function grantWaiver(
  engagementId: string,
  itemKey: ReadinessItemKey,
  reason: string,
): Promise<ActionResult<ReadinessItem>> {
  try {
    if (!isValidItemKey(itemKey)) return { success: false, error: 'Invalid item key' }
    const trimmed = (reason ?? '').trim()
    if (trimmed.length < WAIVER_REASON_MIN_LENGTH) {
      return {
        success: false,
        error: `Waiver reason must be at least ${WAIVER_REASON_MIN_LENGTH} characters`,
      }
    }
    const lead = await resolveLead(engagementId)
    if (!lead.ok) return lead.response

    const item = await waiveItem(engagementId, itemKey, trimmed, lead.ctx.actor)
    await safeAppendAudit({
      engagementId,
      itemId: item.id,
      actor: lead.ctx.actor,
      action: 'waiver_granted',
      details: { itemKey, reason: trimmed },
    })
    revalidateEngagement(engagementId)
    return { success: true, data: item }
  } catch (error) {
    return errorEnvelope(error, 'Failed to grant waiver')
  }
}

/** Lead-only: revoke a previously granted waiver. */
export async function revokeWaiver(
  engagementId: string,
  itemKey: ReadinessItemKey,
): Promise<ActionResult<ReadinessItem>> {
  try {
    if (!isValidItemKey(itemKey)) return { success: false, error: 'Invalid item key' }
    const lead = await resolveLead(engagementId)
    if (!lead.ok) return lead.response

    const item = await unwaiveItem(engagementId, itemKey)
    await safeAppendAudit({
      engagementId,
      itemId: item.id,
      actor: lead.ctx.actor,
      action: 'waiver_revoked',
      details: { itemKey },
    })
    revalidateEngagement(engagementId)
    return { success: true, data: item }
  } catch (error) {
    return errorEnvelope(error, 'Failed to revoke waiver')
  }
}

// Artifact upload/remove actions moved to ./c3pao-readiness-artifacts.ts
// to keep this file under the 500-line hard limit. Importers should use
// `@/app/actions/c3pao-readiness-artifacts` directly.

/**
 * Idempotent: ensures the engagement is in the `PLAN` phase. Fixes the
 * legacy bug where engagements created before the PLAN default exist with
 * an empty phase string and fail the `"" → ASSESS` adjacency check.
 * Called on readiness workspace mount.
 */
export async function ensureEngagementInPlanPhase(
  engagementId: string,
): Promise<ActionResult<void>> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const current = await fetchEngagementPhase(engagementId, session.apiToken)
    if (current.currentPhase && current.currentPhase !== 'PRE_ASSESS') {
      return { success: true }
    }
    // Already in a post-plan phase or already PRE_ASSESS — PRE_ASSESS is the
    // Go API's name for the planning phase, so leave it alone if already set.
    if (current.currentPhase === 'PRE_ASSESS') return { success: true }

    await updateEngagementPhase(engagementId, 'PRE_ASSESS', session.apiToken)
    return { success: true }
  } catch (error) {
    return errorEnvelope(error, 'Failed to initialize engagement phase')
  }
}

/**
 * Lead-only: start the assessment. Re-validates the full checklist server-
 * side (never trusts the client), then performs three side effects in
 * order — status flip → assessment-mode toggle → phase advance — with
 * rollback of prior steps on any failure. Logs a `phase_advanced` audit
 * entry on success.
 */
export async function startAssessment(
  engagementId: string,
): Promise<ActionResult<void>> {
  try {
    const lead = await resolveLead(engagementId)
    if (!lead.ok) return lead.response
    const token = lead.ctx.session.apiToken

    // Re-check canStart against DB state (server is source of truth).
    await ensureItemsSeeded(engagementId)
    const items = await getItems(engagementId)
    const readyCount = items.filter(
      (i) => i.status === 'complete' || i.status === 'waived',
    ).length
    if (readyCount !== 8) {
      return {
        success: false,
        error: `Readiness incomplete (${readyCount}/8) — cannot start assessment`,
      }
    }

    // Capture original state for potential rollback.
    const original = await fetchEngagementDetail(engagementId, token)
    const originalStatus = (original.status as string | undefined) ?? 'ACCEPTED'
    const originalMode = Boolean(original.assessmentModeActive)
    const phaseBefore = (original.currentPhase as string | undefined) ?? null

    let statusFlipped = false
    let modeToggled = false
    try {
      await apiUpdateEngagementStatus(engagementId, { status: 'IN_PROGRESS' }, token)
      statusFlipped = true
      await toggleAssessmentMode(engagementId, true, token)
      modeToggled = true
      await updateEngagementPhase(engagementId, 'ASSESS', token)
    } catch (err) {
      if (modeToggled) await safeRollback(() => toggleAssessmentMode(engagementId, originalMode, token), 'mode')
      if (statusFlipped) await safeRollback(() => apiUpdateEngagementStatus(engagementId, { status: originalStatus }, token), 'status')
      return errorEnvelope(err, 'Failed to start assessment')
    }

    await safeAppendAudit({
      engagementId,
      actor: lead.ctx.actor,
      action: 'phase_advanced',
      details: { from: phaseBefore, to: 'ASSESS' },
    })
    revalidateEngagement(engagementId)
    return { success: true }
  } catch (error) {
    return errorEnvelope(error, 'Failed to start assessment')
  }
}
