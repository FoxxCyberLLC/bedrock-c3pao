import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { fetchEvidenceDownloadURL } from '@/lib/api-client'
import { PROXY_DISPLAY_ALLOWED } from '@/lib/evidence-mime-types'

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ engagementId: string; evidenceId: string }> },
) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { engagementId, evidenceId } = await params

  // Step 1: Get the presigned/dev download URL from Go API
  let downloadUrl: string
  try {
    const urlResponse = await fetchEvidenceDownloadURL(engagementId, evidenceId, session.apiToken)
    downloadUrl = urlResponse.downloadUrl
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get download URL'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // Step 2: Fetch the actual file from the download URL
  let upstream: Response
  try {
    upstream = await fetch(downloadUrl)
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: 502 },
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch file'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // Step 3: Enforce file size limit using Content-Length when available (H4)
  const contentLength = upstream.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the 25MB preview limit. Please download the file instead.` },
      { status: 413 },
    )
  }

  // Step 4: Sanitize Content-Type — strip charset params, allowlist safe types (H3)
  // Fall back to a caller-supplied hint (e.g. ?hint=image/jpeg) when S3 returns
  // no content-type or a generic binary type. This fixes previews for files that
  // were uploaded without explicit S3 object metadata.
  const rawType = upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? ''
  const hintType = request.nextUrl.searchParams.get('hint')?.split(';')[0].trim().toLowerCase() ?? ''
  let contentType: string
  if (PROXY_DISPLAY_ALLOWED.has(rawType)) {
    contentType = rawType
  } else if (hintType && PROXY_DISPLAY_ALLOWED.has(hintType)) {
    contentType = hintType
  } else {
    contentType = 'application/octet-stream'
  }

  // Step 5: Stream the file bytes with size guard for missing Content-Length (H4)
  if (!upstream.body) {
    return NextResponse.json({ error: 'No response body from upstream' }, { status: 502 })
  }

  let bytesReceived = 0
  const sizeGuard = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytesReceived += chunk.byteLength
      if (bytesReceived > MAX_FILE_SIZE_BYTES) {
        controller.error(new Error('File exceeds the 25MB streaming limit'))
      } else {
        controller.enqueue(chunk)
      }
    },
  })

  // H3: Prevent MIME-sniffing and force download for non-display types
  const DISPLAYABLE_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'])
  const disposition = DISPLAYABLE_TYPES.has(contentType) ? 'inline' : 'attachment'

  return new NextResponse(upstream.body.pipeThrough(sizeGuard), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': disposition,
      'Cache-Control': 'private, max-age=300',
      ...(contentLength ? { 'Content-Length': contentLength } : {}),
    },
  })
}
