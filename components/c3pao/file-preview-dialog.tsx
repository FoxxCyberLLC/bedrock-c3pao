'use client'

import { useState, useEffect } from 'react'
import { Download, Loader2, AlertCircle, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getEvidenceDownloadUrlForC3PAO } from '@/app/actions/c3pao-dashboard'

interface FilePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  engagementId: string
  evidenceId: string
  fileName: string
  mimeType: string | null
}

type PreviewType = 'pdf' | 'image' | 'xlsx' | 'unsupported'

function getPreviewType(mimeType: string | null, fileName: string): PreviewType {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (!mimeType) {
    if (ext === 'pdf') return 'pdf'
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image'
    if (ext === 'xlsx' || ext === 'xls') return 'xlsx'
    return 'unsupported'
  }
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('image/')) return 'image'
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    ext === 'xlsx' ||
    ext === 'xls'
  ) return 'xlsx'
  return 'unsupported'
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  engagementId,
  evidenceId,
  fileName,
  mimeType,
}: FilePreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [xlsxData, setXlsxData] = useState<{ sheetName: string; rows: (string | null)[][] } | null>(null)

  const previewType = getPreviewType(mimeType, fileName)
  const proxyUrl = `/api/evidence/${engagementId}/${evidenceId}/proxy`

  useEffect(() => {
    if (!open) {
      setError(null)
      setIsLoading(false)
      setXlsxData(null)
      return
    }
    if (open && previewType === 'xlsx') {
      loadXlsx()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, previewType])

  const loadXlsx = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const previewUrl = `/api/evidence/${engagementId}/${evidenceId}/preview`
      const res = await fetch(previewUrl)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `Failed to load preview (${res.status})`)
      }
      const data = await res.json()
      setXlsxData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load spreadsheet preview.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const result = await getEvidenceDownloadUrlForC3PAO(evidenceId, engagementId)
      if (result.success && result.data) {
        window.open(result.data.url, '_blank')
        toast.success('Download started')
      } else {
        toast.error(result.error || 'Download failed')
      }
    } catch {
      toast.error('Download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-4 text-base">{fileName}</DialogTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-4 pb-4">
          {previewType === 'pdf' && (
            <div className="relative w-full h-full rounded-lg overflow-hidden border bg-muted/20">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                  <p className="text-sm text-destructive text-center">{error}</p>
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Instead
                  </Button>
                </div>
              )}
              {!error && (
                <iframe
                  src={proxyUrl}
                  className="w-full h-full border-0"
                  title={fileName}
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false)
                    setError('Failed to load PDF preview. The file may be too large or the format unsupported.')
                  }}
                />
              )}
            </div>
          )}

          {previewType === 'image' && (
            <div className="relative w-full h-full rounded-lg overflow-hidden border bg-muted/20 flex items-center justify-center">
              {isLoading && (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              )}
              {error && (
                <div className="flex flex-col items-center gap-4 p-8">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                  <p className="text-sm text-destructive text-center">{error}</p>
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Instead
                  </Button>
                </div>
              )}
              {!error && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proxyUrl}
                  alt={fileName}
                  className="max-w-full max-h-full object-contain"
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false)
                    setError('Failed to load image preview.')
                  }}
                />
              )}
            </div>
          )}

          {previewType === 'xlsx' && (
            <div className="w-full h-full rounded-lg border bg-muted/20 overflow-auto">
              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              {error && (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                  <p className="text-sm text-destructive text-center">{error}</p>
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Instead
                  </Button>
                </div>
              )}
              {!isLoading && !error && xlsxData && (
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {xlsxData.rows.map((row, ri) => {
                      const Tag = ri === 0 ? 'th' : 'td'
                      return (
                        <tr key={ri} className={ri === 0 ? 'bg-muted' : undefined}>
                          {row.map((cell, ci) => (
                            <Tag
                              key={ci}
                              className="border border-border px-2 py-1 font-medium whitespace-nowrap"
                            >
                              {cell ?? ''}
                            </Tag>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {previewType === 'unsupported' && (
            <div className="w-full h-full rounded-lg border border-dashed bg-muted/20 flex flex-col items-center justify-center gap-4 p-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Preview not available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This file type ({mimeType || fileName.split('.').pop() || 'unknown'}) cannot be previewed in the browser.
                </p>
              </div>
              <Button onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
