/**
 * Artifact download route.
 *
 * Streams the stored `bytea` blob back to the caller with the original
 * filename and mime type. Binary payload — cannot be delivered through a
 * Server Action.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getArtifactContent } from '@/lib/db-readiness'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: 'Missing artifact id' }, { status: 400 })
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
