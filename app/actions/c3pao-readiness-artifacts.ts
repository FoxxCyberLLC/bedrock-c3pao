'use server'

/**
 * Readiness artifact upload + remove actions, extracted from c3pao-readiness.ts
 * to keep both files under the project's 500-line hard limit.
 *
 * Authorization: any C3PAO user may upload artifacts to a readiness item.
 * Removal requires the caller to be the original uploader OR the lead.
 */

import { revalidatePath } from 'next/cache'
import { requireAuth, requireLeadAssessor } from '@/lib/auth'
import {
  addArtifact,
  getItemByKey,
  removeArtifact as dbRemoveArtifact,
} from '@/lib/db-readiness'
import { appendAudit } from '@/lib/db-audit'
import { READINESS_ITEM_KEYS } from '@/lib/readiness-types'
import type { ReadinessItemKey } from '@/lib/readiness-types'

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
  try { revalidatePath(`/engagements/${engagementId}`) } catch { /* test env */ }
}

async function safeAppendAudit(params: Parameters<typeof appendAudit>[0]): Promise<void> {
  try { await appendAudit(params) } catch (e) { console.error('[readiness-artifacts] audit failed', e) }
}

export interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

function errorEnvelope<T>(error: unknown, fallback: string): ActionResult<T> {
  return { success: false, error: error instanceof Error ? error.message : fallback }
}

/**
 * Any team member: upload a single PDF/image/Office doc artifact (≤50MB)
 * to the named readiness item. Records `artifact_uploaded` in the audit log.
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
    if (!(file instanceof File)) return { success: false, error: 'File is required' }
    if (file.size === 0) return { success: false, error: 'File is empty' }
    if (file.size > MAX_ARTIFACT_BYTES) {
      return { success: false, error: `File exceeds ${MAX_ARTIFACT_BYTES / (1024 * 1024)} MB limit` }
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
      details: { itemKey, artifactId, filename: artifact.filename, removedBy: isUploader ? 'uploader' : 'lead' },
    })
    revalidateEngagement(engagementId)
    return { success: true }
  } catch (error) {
    return errorEnvelope(error, 'Failed to remove artifact')
  }
}
