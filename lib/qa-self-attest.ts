/**
 * CAP v2.0 self-attestation flow on the `form_qad` readiness item.
 *
 * Lives outside lib/api-client.ts so the find-and-upsert orchestration is
 * unit-testable: vitest cannot mock in-module function references, so the
 * primitives (fetchEngagementQAReviews, createQAReview, updateQAReview)
 * must be imported across module boundaries to be mockable.
 *
 * Two layers in this file:
 *   - selfAttestPreAssessForm / revokeSelfAttestPreAssessForm: low-level
 *     orchestration. Throw on API failure. Return the resulting QAReview
 *     (or null when no row exists / nothing to revoke).
 *   - attestFormQad / revokeFormQad: action-layer envelopes. Wrap the
 *     low-level functions and convert throws into ActionResult-style
 *     {success, error?} envelopes.
 */

import {
  fetchEngagementQAReviews,
  createQAReview,
  updateQAReview,
  type QAReview,
} from '@/lib/api-client'

const SELF_ATTEST_NOTES = 'Self-attested via readiness checklist'

/**
 * Idempotently produce an APPROVED self-attested PRE_ASSESS_FORM QAReview
 * for the engagement. Used by the lead's `form_qad` completion flow to
 * satisfy the server-side QA gate (`PRE_ASSESS → ASSESS`).
 *
 * Behavior:
 * 1. If an APPROVED non-self-attested PRE_ASSESS_FORM row already exists
 *    (i.e. an independent reviewer has approved), the gate is already
 *    satisfied — return that row as a no-op without creating a duplicate.
 * 2. If a self-attested PRE_ASSESS_FORM row exists and is APPROVED → no-op.
 * 3. If a self-attested row exists with another status → PATCH to APPROVED.
 * 4. Otherwise → POST to create (status defaults PENDING) → PATCH to APPROVED.
 *
 * Race-safety: if step 4's POST fails (e.g. partial-unique-index violation
 * because a concurrent caller already created the row), re-fetch and PATCH
 * the now-existing row to APPROVED. Only re-throw if no row appeared.
 *
 * Stranded-PENDING contract: if POST succeeds and PATCH-to-APPROVED fails,
 * the row is left as PENDING and this helper throws. The next call finds
 * the existing row (step 3) and patches it idempotently.
 */
export async function selfAttestPreAssessForm(
  engagementId: string,
  leadId: string,
  token: string,
): Promise<QAReview | null> {
  const existing = await fetchEngagementQAReviews(engagementId, token)
  const independentApproved = existing.find(
    (r) => r.kind === 'PRE_ASSESS_FORM' && r.status === 'APPROVED' && !r.selfAttested,
  )
  if (independentApproved) return independentApproved

  const selfRow = existing.find(
    (r) => r.kind === 'PRE_ASSESS_FORM' && r.selfAttested,
  )
  if (selfRow) {
    if (selfRow.status === 'APPROVED') return selfRow
    return updateQAReview(selfRow.id, { status: 'APPROVED' }, token)
  }

  let created: QAReview
  try {
    created = await createQAReview(
      engagementId,
      {
        kind: 'PRE_ASSESS_FORM',
        // Server overwrites with requester id when selfAttested=true; we
        // pass leadId for clarity but the server is authoritative.
        assignedToId: leadId,
        selfAttested: true,
        notes: SELF_ATTEST_NOTES,
      },
      token,
    )
  } catch (createErr) {
    // Possible race with a concurrent self-attest call — re-fetch.
    const refetched = await fetchEngagementQAReviews(engagementId, token)
    const racingRow = refetched.find(
      (r) => r.kind === 'PRE_ASSESS_FORM' && r.selfAttested,
    )
    if (!racingRow) throw createErr
    if (racingRow.status === 'APPROVED') return racingRow
    return updateQAReview(racingRow.id, { status: 'APPROVED' }, token)
  }

  return updateQAReview(created.id, { status: 'APPROVED' }, token)
}

/**
 * Idempotently revert the self-attested PRE_ASSESS_FORM row to PENDING so
 * the QA gate fires again. Independent-reviewer rows are intentionally
 * untouched.
 */
export async function revokeSelfAttestPreAssessForm(
  engagementId: string,
  token: string,
): Promise<QAReview | null> {
  const existing = await fetchEngagementQAReviews(engagementId, token)
  const selfRow = existing.find(
    (r) => r.kind === 'PRE_ASSESS_FORM' && r.selfAttested,
  )
  if (!selfRow) return null
  if (selfRow.status !== 'APPROVED') return selfRow
  return updateQAReview(selfRow.id, { status: 'PENDING' }, token)
}

export interface QASelfAttestResult {
  success: boolean
  error?: string
}

/**
 * Idempotently produce an APPROVED self-attested PRE_ASSESS_FORM QAReview
 * for the engagement. Returns `{success: true}` on success or `{success:
 * false, error}` on API failure. The action layer is responsible for any
 * local-DB rollback when this returns failure.
 */
export async function attestFormQad(
  engagementId: string,
  leadId: string,
  token: string,
): Promise<QASelfAttestResult> {
  try {
    await selfAttestPreAssessForm(engagementId, leadId, token)
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Failed to record pre-assessment QA self-attestation',
    }
  }
}

/**
 * Idempotently revert the self-attested PRE_ASSESS_FORM row to PENDING.
 * No-op when no self-attested row exists. Independent-reviewer rows are
 * intentionally untouched.
 */
export async function revokeFormQad(
  engagementId: string,
  token: string,
): Promise<QASelfAttestResult> {
  try {
    await revokeSelfAttestPreAssessForm(engagementId, token)
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Failed to revoke pre-assessment QA self-attestation',
    }
  }
}

/**
 * Wrap a self-attest (or revoke) attempt with rollback semantics for the
 * caller's local readiness state. Centralises the "API failed → rollback
 * local; if rollback also failed → emit audit so ops can spot the stuck
 * engagement" pattern so the c3pao-readiness action layer stays under the
 * 500-line hard limit.
 *
 * `audit` is a callback (typically `safeAppendAudit`) that the caller
 * supplies so this module doesn't have to depend on db-audit directly.
 */
export interface FormQadStepActor {
  id: string
  email: string
  name: string
}
export interface FormQadStepAuditEntry {
  engagementId: string
  itemId: string
  actor: FormQadStepActor
  action: 'phase_advanced'
  details: { error: 'rollback_failed'; original: string }
}
export type FormQadStepAuditFn = (entry: FormQadStepAuditEntry) => Promise<void>

export async function formQadStep(opts: {
  attempt: () => Promise<QASelfAttestResult>
  rollback: () => Promise<unknown>
  label: 'attest' | 'revoke'
  engagementId: string
  itemId: string
  actor: FormQadStepActor
  audit: FormQadStepAuditFn
}): Promise<QASelfAttestResult> {
  const result = await opts.attempt()
  if (result.success) return result
  try {
    await opts.rollback()
  } catch (rollbackErr) {
    console.error(`[qa-self-attest] form_qad ${opts.label} rollback failed`, rollbackErr)
    await opts.audit({
      engagementId: opts.engagementId,
      itemId: opts.itemId,
      actor: opts.actor,
      action: 'phase_advanced',
      details: { error: 'rollback_failed', original: result.error ?? '' },
    })
  }
  return result
}
