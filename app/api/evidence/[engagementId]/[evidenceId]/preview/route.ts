import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { fetchEvidenceDownloadURL } from '@/lib/api-client'
import ExcelJS from 'exceljs'

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB
const MAX_PREVIEW_ROWS = 1000

function cellToString(v: ExcelJS.CellValue): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v instanceof Date) return v.toISOString().split('T')[0]
  if (typeof v === 'object') {
    if ('richText' in v) {
      return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join('')
    }
    if ('formula' in v) {
      const result = (v as ExcelJS.CellFormulaValue).result
      return result !== undefined && result !== null ? String(result) : ''
    }
    if ('text' in v && 'hyperlink' in v) {
      return (v as ExcelJS.CellHyperlinkValue).text ?? null
    }
    if ('error' in v) return '#ERROR'
  }
  return null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ engagementId: string; evidenceId: string }> },
) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { engagementId, evidenceId } = await params

  let downloadUrl: string
  try {
    const urlResponse = await fetchEvidenceDownloadURL(engagementId, evidenceId, session.apiToken)
    downloadUrl = urlResponse.downloadUrl
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get download URL'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  let upstream: Response
  try {
    upstream = await fetch(downloadUrl)
    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream returned ${upstream.status}` }, { status: 502 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch file'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const contentLength = upstream.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'File exceeds the 25MB preview limit. Please download the file instead.' },
      { status: 413 },
    )
  }

  let buffer: ArrayBuffer
  try {
    buffer = await upstream.arrayBuffer()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read file'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // Size guard for when Content-Length header is absent (H4)
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'File exceeds the 25MB preview limit. Please download the file instead.' },
      { status: 413 },
    )
  }

  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    const sheet = workbook.worksheets[0]
    if (!sheet) {
      return NextResponse.json({ error: 'Empty workbook' }, { status: 422 })
    }

    const rows: (string | null)[][] = []
    sheet.eachRow({ includeEmpty: false }, (row) => {
      if (rows.length >= MAX_PREVIEW_ROWS) return
      const values = (row.values as ExcelJS.CellValue[]).slice(1) // skip 1-indexed null at [0]
      rows.push(values.map(cellToString))
    })

    return NextResponse.json({
      sheetName: sheet.name,
      rowCount: sheet.rowCount,
      rows,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to parse spreadsheet' }, { status: 422 })
  }
}
