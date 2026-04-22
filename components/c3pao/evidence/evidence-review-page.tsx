'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Download,
  FileText,
  FileWarning,
  Shield,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { getEvidenceDownloadUrlForC3PAO } from '@/app/actions/c3pao-dashboard'
import { InternalReviewThread } from '@/components/c3pao/internal-review-thread'
import type { EvidenceView } from '@/lib/api-client'

interface EvidenceReviewPageProps {
  evidence: EvidenceView
  engagementId: string
  currentUserId: string
}

const PREVIEWABLE_INLINE = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
])

function getPreviewType(mimeType: string | null): 'pdf' | 'image' | 'unsupported' {
  if (!mimeType) return 'unsupported'
  const mime = mimeType.toLowerCase()
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  return 'unsupported'
}

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes === 0) return 'Unknown'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export function EvidenceReviewPage({
  evidence,
  engagementId,
  currentUserId,
}: EvidenceReviewPageProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const previewType = getPreviewType(evidence.mimeType)
  const previewUrl = PREVIEWABLE_INLINE.has(evidence.mimeType?.toLowerCase() ?? '')
    ? `/api/evidence/${engagementId}/${evidence.id}/proxy`
    : null

  const isExpired = evidence.expirationDate
    ? new Date(evidence.expirationDate) < new Date()
    : false
  const isExpiringSoon = evidence.expirationDate
    ? (() => {
        const days = Math.ceil(
          (new Date(evidence.expirationDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        )
        return days <= 30 && days > 0
      })()
    : false

  async function handleDownload() {
    setIsDownloading(true)
    try {
      const result = await getEvidenceDownloadUrlForC3PAO(evidence.id, engagementId)
      if (result.success && result.data) {
        window.open(result.data.url, '_blank')
      } else {
        toast.error(result.error || 'Failed to generate download URL')
      }
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      {/* Preview column */}
      <div className="space-y-4 min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <FileText className="h-5 w-5 text-primary" />
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
            <Download className="mr-2 h-4 w-4" />
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
                className="flex items-center justify-center bg-muted/30 p-4"
                style={{ minHeight: '400px' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={evidence.fileName}
                  className="max-w-full max-h-[calc(100vh-300px)] object-contain rounded"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <FileWarning className="h-12 w-12 mb-3 opacity-50" />
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
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar column */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Uploaded</span>
              <span>{format(new Date(evidence.uploadedAt), 'MMM d, yyyy')}</span>
            </div>
            {evidence.uploadedBy && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">By</span>
                <span className="truncate max-w-[180px]">{evidence.uploadedBy}</span>
              </div>
            )}
            {evidence.expirationDate && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Expiration</span>
                  <span
                    className={
                      isExpired
                        ? 'text-red-600 font-medium'
                        : isExpiringSoon
                          ? 'text-yellow-600 font-medium'
                          : ''
                    }
                  >
                    {format(new Date(evidence.expirationDate), 'MMM d, yyyy')}
                  </span>
                </div>
                {(isExpired || isExpiringSoon) && (
                  <div
                    className={`flex items-center gap-1.5 text-xs ${isExpired ? 'text-red-600' : 'text-yellow-600'}`}
                  >
                    <AlertCircle className="h-3 w-3" />
                    {isExpired ? 'This evidence has expired' : 'Expiring within 30 days'}
                  </div>
                )}
              </>
            )}
            {evidence.description && (
              <>
                <Separator />
                <div>
                  <span className="text-muted-foreground text-xs">Description</span>
                  <p className="mt-1 whitespace-pre-wrap">{evidence.description}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Linked Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            {evidence.requirementIds && evidence.requirementIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {evidence.requirementIds.map((reqId) => (
                  <Badge key={reqId} variant="secondary" className="font-mono text-xs">
                    {reqId}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No controls linked to this evidence.
              </p>
            )}
          </CardContent>
        </Card>

        <InternalReviewThread
          engagementId={engagementId}
          entityType="EVIDENCE"
          entityId={evidence.id}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  )
}
