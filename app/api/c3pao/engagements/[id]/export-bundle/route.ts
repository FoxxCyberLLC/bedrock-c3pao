/**
 * Audit-bundle export route.
 *
 * Lead-only. Streams a zip containing the full readiness record for the
 * engagement: manifest, checklist JSON, audit log, notes + revisions,
 * and every uploaded artifact (each prefixed with its id).
 */

import { Readable } from 'node:stream'
import archiver from 'archiver'
import { NextResponse, type NextRequest } from 'next/server'
import { requireLeadAssessor } from '@/lib/auth'
import { getArtifactContent, getItems } from '@/lib/db-readiness'
import { appendAudit, getAuditLog } from '@/lib/db-audit'
import { listNotes, listRevisions } from '@/lib/db-notes'

const BUNDLE_SCHEMA_VERSION = 1
/** Aggregate cap on artifact bytes in one bundle — guards against OOM/huge zips. */
const MAX_BUNDLE_ARTIFACT_BYTES = 500 * 1024 * 1024 // 500 MB

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: engagementId } = await ctx.params
  if (!engagementId) {
    return NextResponse.json({ error: 'Missing engagement id' }, { status: 400 })
  }

  const { session, isLead, error } = await requireLeadAssessor(engagementId)
  if (!session) {
    return NextResponse.json({ error: error ?? 'Unauthorized' }, { status: 401 })
  }
  if (!isLead) {
    return NextResponse.json(
      { error: 'Lead assessor required' },
      { status: 403 },
    )
  }

  const [items, auditLog, notes] = await Promise.all([
    getItems(engagementId),
    getAuditLog(engagementId, { limit: 10_000 }),
    listNotes(engagementId),
  ])

  const notesWithRevisions = await Promise.all(
    notes.map(async (note) => ({
      ...note,
      revisions: await listRevisions(note.id),
    })),
  )

  const manifest = {
    bundleSchemaVersion: BUNDLE_SCHEMA_VERSION,
    engagementId,
    generatedAt: new Date().toISOString(),
    generatedBy: {
      id: session.c3paoUser.id,
      name: session.c3paoUser.name,
      email: session.c3paoUser.email,
    },
    counts: {
      items: items.length,
      artifacts: items.reduce((sum, i) => sum + i.artifacts.length, 0),
      auditEntries: auditLog.length,
      notes: notes.length,
    },
  }

  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.on('error', (err) => {
    console.error('[export-bundle] archive error', err)
  })

  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })
  archive.append(JSON.stringify(items, null, 2), {
    name: 'readiness/checklist.json',
  })
  archive.append(JSON.stringify(auditLog, null, 2), {
    name: 'readiness/audit-log.json',
  })
  archive.append(JSON.stringify(notesWithRevisions, null, 2), {
    name: 'notes/notes.json',
  })

  let bundleArtifactBytes = 0
  const skipped: Array<{ id: string; filename: string; sizeBytes: number }> = []
  for (const item of items) {
    for (const artifact of item.artifacts) {
      const blob = await getArtifactContent(artifact.id)
      if (!blob) continue
      // Enforce an aggregate cap so a runaway artifact set can't OOM the worker
      // or produce an unbounded zip. Over the cap, skip-with-warning rather than
      // truncating silently — the manifest records what was left out.
      if (bundleArtifactBytes + blob.content.length > MAX_BUNDLE_ARTIFACT_BYTES) {
        skipped.push({ id: artifact.id, filename: blob.filename, sizeBytes: blob.content.length })
        continue
      }
      bundleArtifactBytes += blob.content.length
      const safeName = safeFilename(blob.filename)
      archive.append(blob.content, {
        name: `readiness/artifacts/${artifact.id}__${safeName}`,
      })
    }
  }

  if (skipped.length > 0) {
    console.warn(
      `[export-bundle] skipped ${skipped.length} artifact(s) over the ${MAX_BUNDLE_ARTIFACT_BYTES}-byte bundle cap`,
    )
    archive.append(
      JSON.stringify(
        {
          reason: `aggregate artifact size exceeded ${MAX_BUNDLE_ARTIFACT_BYTES} bytes; these artifacts were omitted`,
          skipped,
        },
        null,
        2,
      ),
      { name: 'readiness/artifacts/_SKIPPED.json' },
    )
  }

  // Surface finalize errors instead of swallowing them with `void`. We do NOT
  // `await` here: the archive is streamed as the response body below and only
  // drains once the client reads it, so awaiting before returning would
  // deadlock (and buffering the whole zip would reintroduce the OOM risk). On a
  // finalize error, destroy the stream so the client sees a torn download
  // rather than a silently-truncated archive.
  archive.finalize().catch((err) => {
    console.error('[export-bundle] finalize failed', err)
    archive.destroy(err instanceof Error ? err : new Error(String(err)))
  })

  try {
    await appendAudit({
      engagementId,
      actor: {
        id: session.c3paoUser.id,
        email: session.c3paoUser.email,
        name: session.c3paoUser.name,
      },
      action: 'audit_exported',
      details: {
        items: manifest.counts.items,
        artifacts: manifest.counts.artifacts,
        auditEntries: manifest.counts.auditEntries,
        notes: manifest.counts.notes,
      },
    })
  } catch (err) {
    console.error('[export-bundle] audit append failed', err)
  }

  const datePart = new Date().toISOString().slice(0, 10)
  const filename = `engagement-${safeFilename(engagementId)}-audit-${datePart}.zip`
  const body = Readable.toWeb(archive) as ReadableStream

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
