/**
 * Artifact download route.
 *
 * Streams the stored `bytea` blob back to the caller with the original
 * filename and mime type. Binary payload — cannot be delivered through a
 * Server Action.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth, requireLeadAssessor } from '@/lib/auth'
import { getArtifactContent, getArtifactEngagementId } from '@/lib/db-readiness'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  // Require auth first so an anonymous caller can't probe artifact existence.
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: 'Missing artifact id' }, { status: 400 })
  }

  // Scope the download to the caller's engagement (M3 — prevent IDOR). Resolve
  // the owning engagement without loading the blob, then require lead access to
  // that engagement (mirrors the lead-only export-bundle route).
  const engagementId = await getArtifactEngagementId(id)
  if (!engagementId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const { isLead } = await requireLeadAssessor(engagementId)
  if (!isLead) {
    return NextResponse.json({ error: 'Lead assessor required' }, { status: 403 })
  }

  const artifact = await getArtifactContent(id)
  if (!artifact) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const encoded = encodeURIComponent(artifact.filename)
  return new NextResponse(new Uint8Array(artifact.content), {
    status: 200,
    headers: {
      'Content-Type': artifact.mimeType,
      'Content-Disposition': `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
