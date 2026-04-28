import { NextResponse } from 'next/server'
import { requireAuth, requireOutsideLeadAssessor } from '@/lib/auth'
import { getOutsideEvidenceContent } from '@/lib/db-outside-assessments'
import {
  PROXY_DISPLAY_ALLOWED,
  isProxyDisplayable,
} from '@/lib/evidence-mime-types'

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

const DISPLAYABLE_INLINE = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
])

/**
 * BYTEA-backed evidence proxy for outside engagements. Reads the full blob
 * into a Buffer (≤25MB) — pg does not natively stream BYTEA columns. Mirrors
 * the OSC proxy's defense-in-depth: content-type allowlist, X-Content-Type-Options,
 * private cache, inline-vs-attachment disposition.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ engagementId: string; evidenceId: string }> },
) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { engagementId, evidenceId } = await params

  const auth = await requireOutsideLeadAssessor(engagementId)
  if (!auth.session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!auth.isLead) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const evidence = await getOutsideEvidenceContent(evidenceId)
  if (!evidence) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (evidence.engagementId !== engagementId) {
    // URL/engagement mismatch — refuse to leak cross-engagement evidence
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (evidence.sizeBytes > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'Evidence exceeds the 25MB preview limit' },
      { status: 413 },
    )
  }

  const rawType = evidence.mimeType.toLowerCase()
  const contentType = isProxyDisplayable(rawType)
    ? rawType
    : PROXY_DISPLAY_ALLOWED.has(rawType)
      ? rawType
      : 'application/octet-stream'

  const disposition = DISPLAYABLE_INLINE.has(contentType) ? 'inline' : 'attachment'
  const filenameSafe = evidence.fileName.replace(/"/g, '\\"')

  return new NextResponse(new Uint8Array(evidence.content), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `${disposition}; filename="${filenameSafe}"`,
      'Cache-Control': 'private, max-age=300',
      'Content-Length': String(evidence.sizeBytes),
    },
  })
}
