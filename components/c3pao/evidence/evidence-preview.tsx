'use client'

import { useState } from 'react'
import { Download, FileText, FileWarning } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getEvidenceDownloadUrlForC3PAO } from '@/app/actions/c3pao-dashboard'
import { triggerFileDownload } from '@/lib/download'
import type { EvidenceView } from '@/lib/api-client'

const PREVIEWABLE_INLINE = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
])

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes === 0) return 'Unknown'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function getPreviewType(mimeType: string | null): 'pdf' | 'image' | 'unsupported' {
  if (!mimeType) return 'unsupported'
  const m = mimeType.toLowerCase()
  if (m === 'application/pdf') return 'pdf'
  if (m.startsWith('image/')) return 'image'
  return 'unsupported'
}

interface EvidencePreviewProps {
  /** Stable across right-column updates — only changes when navigating to a
   *  different evidence file. The iframe is intentionally isolated here so
   *  React reconciliation never re-mounts it on right-column state changes. */
  evidence: EvidenceView
  engagementId: string
  /** OSC engagements proxy through Go API. Outside engagements use the local
   *  BYTEA proxy at /api/outside-evidence. */
  engagementKind: 'osc' | 'outside_osc'
}

export function EvidencePreview({
  evidence,
  engagementId,
  engagementKind,
}: EvidencePreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const previewType = getPreviewType(evidence.mimeType)
  const previewUrl = PREVIEWABLE_INLINE.has(evidence.mimeType?.toLowerCase() ?? '')
    ? engagementKind === 'outside_osc'
      ? `/api/outside-evidence/${engagementId}/${evidence.id}/proxy`
      : `/api/evidence/${engagementId}/${evidence.id}/proxy`
    : null

  async function handleDownload() {
    setIsDownloading(true)
    try {
      if (engagementKind === 'outside_osc') {
        // For outside, the proxy IS the download URL.
        triggerFileDownload(
          `/api/outside-evidence/${engagementId}/${evidence.id}/proxy`,
          evidence.fileName,
        )
        toast.success('Download started', { description: evidence.fileName })
        return
      }
      const result = await getEvidenceDownloadUrlForC3PAO(evidence.id, engagementId)
      if (result.success && result.data) {
        triggerFileDownload(result.data.url, evidence.fileName)
        toast.success('Download started', { description: evidence.fileName })
      } else {
        toast.error(result.error || 'Failed to generate download URL')
      }
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <FileText className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{evidence.fileName}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{formatFileSize(evidence.fileSize)}</span>
            <span>·</span>
            <span className="font-mono">v{evidence.version}</span>
            {evidence.mimeType && (
              <>
                <span>·</span>
                <span className="truncate">{evidence.mimeType}</span>
              </>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          <Download className="mr-2 h-4 w-4" aria-hidden />
          Download
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {previewType === 'pdf' && previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full border-0"
              style={{ height: 'calc(100vh - 260px)', minHeight: '600px' }}
              title={`Preview: ${evidence.fileName}`}
            />
          ) : previewType === 'image' && previewUrl ? (
            <div
              className="relative flex items-center justify-center bg-muted/30 p-4"
              style={{ minHeight: '400px' }}
            >
              {/*
                Evidence images come from an internal proxy with unknown
                dimensions. next/image needs width/height; using a plain
                <img> with explicit object-contain sizing is the right
                trade-off here, and we'll accept the next-image hint.
              */}
              <img
                src={previewUrl}
                alt={evidence.fileName}
                className="max-w-full max-h-[calc(100vh-300px)] object-contain rounded"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <FileWarning className="h-12 w-12 mb-3 opacity-50" aria-hidden />
              <p className="text-sm font-medium">Preview not available</p>
              <p className="text-xs mt-1">
                {evidence.mimeType
                  ? `No inline preview for ${evidence.mimeType.split('/').pop()?.toUpperCase()} files.`
                  : 'File type is unknown.'}
              </p>
              <p className="text-xs mt-0.5">
                Download this file to view it in your preferred application.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                <Download className="mr-2 h-4 w-4" aria-hidden />
                Download
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
