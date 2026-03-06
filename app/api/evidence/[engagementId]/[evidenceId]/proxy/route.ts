import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { fetchEvidenceDownloadURL } from '@/lib/api-client'

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB

export async function GET(
  _request: NextRequest,
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

  // Step 3: Enforce file size limit before streaming
  const contentLength = upstream.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the 25MB preview limit. Please download the file instead.` },
      { status: 413 },
    )
  }

  // Step 4: Forward Content-Type (critical for PDF rendering in iframe)
  const contentType = upstream.headers.get('content-type') || 'application/octet-stream'

  // Step 5: Stream the file bytes — avoid buffering entire file into memory
  if (!upstream.body) {
    return NextResponse.json({ error: 'No response body from upstream' }, { status: 502 })
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=300',
      ...(contentLength ? { 'Content-Length': contentLength } : {}),
    },
  })
}
