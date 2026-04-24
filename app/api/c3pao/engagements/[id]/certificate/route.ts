/**
 * Draft CMMC L2 certificate PDF download.
 *
 * Renders <CMMCCertificate /> via @react-pdf/renderer's renderToBuffer and
 * streams it back as application/pdf. Read-only — nothing persists. Until
 * the Go API exposes a cert-issuance endpoint, every PDF returned here is
 * marked DRAFT in the watermark, certUid, and filename.
 */

import { createElement, type ReactElement } from 'react'
import { NextResponse, type NextRequest } from 'next/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { getCertificateDataForEngagement } from '@/app/actions/c3pao-certificate'
import {
  CMMCCertificate,
  type CertificateData,
} from '@/lib/pdf-templates/cmmc-certificate'

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: 'Missing engagement id' }, { status: 400 })
  }

  const result = await getCertificateDataForEngagement(id)
  if (!result.success || !result.data) {
    const status = result.error === 'Unauthorized' ? 401 : 404
    return NextResponse.json(
      { error: result.error ?? 'Certificate not available' },
      { status },
    )
  }

  const data: CertificateData = result.data

  let pdfBuffer: Buffer
  try {
    const element = createElement(CMMCCertificate, { data }) as unknown as ReactElement<DocumentProps>
    pdfBuffer = await renderToBuffer(element)
  } catch (err) {
    console.error('[certificate] renderToBuffer failed', err)
    return NextResponse.json(
      { error: 'Failed to render certificate PDF' },
      { status: 500 },
    )
  }

  const filename = `cmmc-cert-draft-${safeFilename(data.certUid)}.pdf`

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
