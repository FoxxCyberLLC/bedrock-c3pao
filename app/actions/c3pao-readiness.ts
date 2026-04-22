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
  addArtifact,
  ensureItemsSeeded,
  getItemByKey,
  getItems,
  markItemComplete,
  removeArtifact as dbRemoveArtifact,
  unmarkItemComplete,
  waiveItem,
  unwaiveItem,
} from '@/lib/db-readiness'
import { appendAudit, getAuditLog } from '@/lib/db-audit'
import {
  fetchEngagementPhase,
  updateEngagementPhase,
} from '@/lib/api-client'
import { READINESS_ITEM_KEYS } from '@/lib/readiness-types'
import type {
  AuditEntry,
  ReadinessChecklist,
  ReadinessItem,
  ReadinessItemKey,
} from '@/lib/readiness-types'

const WAIVER_REASON_MIN_LENGTH = 20
const MAX_ARTIFACT_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_MIME_TYPES = new Set<string>([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'text/plain',
  'text/csv',
])

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
  session: Awaited<ReturnType<typeof requireLeadAssessor>>['session']
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
    await safeAppendAudit({
      engagementId,
      itemId: item.id,
      actor: lead.ctx.actor,
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
    await safeAppendAudit({
      engagementId,
      itemId: item.id,
      actor: lead.ctx.actor,
      action: 'item_uncompleted',
      details: { itemKey },
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

/**
 * Upload an artifact blob to an item. Any authenticated team member can
 * upload. Enforces 50 MB max and a mime-type allowlist. Advances item
 * status to `in_progress` at the DB layer if it was `not_started`.
 */
export async function uploadArtifact(
  engagementId: string,
  itemKey: ReadinessItemKey,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!isValidItemKey(itemKey)) return { success: false, error: 'Invalid item key' }
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return { success: false, error: 'File is required' }
    }
    if (file.size === 0) {
      return { success: false, error: 'File is empty' }
    }
    if (file.size > MAX_ARTIFACT_BYTES) {
      return {
        success: false,
        error: `File exceeds ${MAX_ARTIFACT_BYTES / (1024 * 1024)} MB limit`,
      }
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return { success: false, error: `Unsupported file type: ${file.type || 'unknown'}` }
    }

    const item = await getItemByKey(engagementId, itemKey)
    if (!item) return { success: false, error: 'Readiness item not found' }

    const descriptionRaw = formData.get('description')
    const description = typeof descriptionRaw === 'string' ? descriptionRaw : null

    const actor = {
      id: session.c3paoUser.id,
      email: session.c3paoUser.email,
      name: session.c3paoUser.name,
    }
    const content = Buffer.from(await file.arrayBuffer())
    const artifact = await addArtifact(item.id, {
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      content,
      description,
      uploadedBy: actor.name,
      uploadedByEmail: actor.email,
    })

    await safeAppendAudit({
      engagementId,
      itemId: item.id,
      actor,
      action: 'artifact_uploaded',
      details: {
        itemKey,
        artifactId: artifact.id,
        filename: artifact.filename,
        sizeBytes: artifact.sizeBytes,
        mimeType: artifact.mimeType,
      },
    })
    revalidateEngagement(engagementId)
    return { success: true, data: { id: artifact.id } }
  } catch (error) {
    return errorEnvelope(error, 'Failed to upload artifact')
  }
}

/**
 * Remove an uploaded artifact. Any team member may remove an artifact they
 * uploaded; the lead may remove any artifact on the engagement.
 */
export async function removeArtifact(
  engagementId: string,
  itemKey: ReadinessItemKey,
  artifactId: string,
): Promise<ActionResult<void>> {
  try {
    if (!isValidItemKey(itemKey)) return { success: false, error: 'Invalid item key' }
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const item = await getItemByKey(engagementId, itemKey)
    if (!item) return { success: false, error: 'Readiness item not found' }
    const artifact = item.artifacts.find((a) => a.id === artifactId)
    if (!artifact) return { success: false, error: 'Artifact not found on this item' }

    const callerEmail = session.c3paoUser.email
    const isUploader = artifact.uploadedByEmail === callerEmail
    let isLead = session.c3paoUser.isLeadAssessor
    if (!isUploader && !isLead) {
      const lead = await requireLeadAssessor(engagementId)
      isLead = lead.isLead
    }
    if (!isUploader && !isLead) {
      return { success: false, error: 'Only the uploader or a lead assessor may remove this artifact' }
    }

    await dbRemoveArtifact(artifactId)
    await safeAppendAudit({
      engagementId,
      itemId: item.id,
      actor: {
        id: session.c3paoUser.id,
        email: session.c3paoUser.email,
        name: session.c3paoUser.name,
      },
      action: 'artifact_removed',
      details: {
        itemKey,
        artifactId,
        filename: artifact.filename,
        removedBy: isUploader ? 'uploader' : 'lead',
      },
    })
    revalidateEngagement(engagementId)
    return { success: true }
  } catch (error) {
    return errorEnvelope(error, 'Failed to remove artifact')
  }
}

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
 * side (never trusts the client), transitions the engagement to `ASSESS`
 * via the Go API, logs a `phase_advanced` audit entry.
 */
export async function startAssessment(
  engagementId: string,
): Promise<ActionResult<void>> {
  try {
    const lead = await resolveLead(engagementId)
    if (!lead.ok) return lead.response
    const session = lead.ctx.session
    if (!session) return { success: false, error: 'Unauthorized' }

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

    const current = await fetchEngagementPhase(engagementId, session.apiToken)
    const fromPhase = current.currentPhase ?? null

    await updateEngagementPhase(engagementId, 'ASSESS', session.apiToken)

    await safeAppendAudit({
      engagementId,
      actor: lead.ctx.actor,
      action: 'phase_advanced',
      details: { from: fromPhase, to: 'ASSESS' },
    })
    revalidateEngagement(engagementId)
    return { success: true }
  } catch (error) {
    return errorEnvelope(error, 'Failed to start assessment')
  }
}
