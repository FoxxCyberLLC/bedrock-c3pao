'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  Download,
  ExternalLink,
  Calendar,
  HardDrive,
  Link2,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  getEvidenceDetailsForC3PAO,
  getEvidenceDownloadUrlForC3PAO,
} from '@/app/actions/c3pao-dashboard'
import { FilePreviewDialog } from './file-preview-dialog'

interface Evidence {
  id: string
  fileName: string
  description: string | null
  mimeType: string | null
  fileSize: number | null
  createdAt: Date
}

interface EvidenceDetailDialogProps {
  evidence: Evidence | null
  engagementId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface LinkedControl {
  id: string
  controlId: string
  title: string
  familyCode: string
  familyName: string
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown'
  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let size = bytes
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

function getFileCategory(mimeType: string | null): string {
  if (!mimeType) return 'other'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'spreadsheet'
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) return 'document'
  return 'other'
}

function getFileIcon(mimeType: string | null, size: 'sm' | 'lg' = 'sm') {
  const category = getFileCategory(mimeType)
  const className = size === 'lg' ? 'h-12 w-12' : 'h-5 w-5'
  switch (category) {
    case 'image':
      return <ImageIcon className={`${className} text-blue-500`} />
    case 'pdf':
      return <FileText className={`${className} text-red-500`} />
    case 'spreadsheet':
      return <FileSpreadsheet className={`${className} text-green-500`} />
    case 'document':
      return <FileText className={`${className} text-blue-600`} />
    default:
      return <File className={`${className} text-gray-500`} />
  }
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE'
}

export function EvidenceDetailDialog({
  evidence,
  engagementId,
  open,
  onOpenChange,
}: EvidenceDetailDialogProps) {
  const [linkedControls, setLinkedControls] = useState<LinkedControl[]>([])
  const [expirationDate, setExpirationDate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    if (open && evidence) {
      loadDetails()
    } else {
      setLinkedControls([])
      setExpirationDate(null)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, evidence?.id])

  const loadDetails = async () => {
    if (!evidence) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await getEvidenceDetailsForC3PAO(evidence.id, engagementId)
      if (result.success && result.data) {
        setLinkedControls(result.data.linkedControls)
        setExpirationDate(result.data.evidence.expirationDate ? new Date(result.data.evidence.expirationDate) : null)
      } else {
        setError(result.error || 'Failed to load evidence details')
      }
    } catch {
      setError('Failed to load evidence details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!evidence) return

    setIsDownloading(true)
    try {
      const result = await getEvidenceDownloadUrlForC3PAO(evidence.id, engagementId)
      if (result.success && result.data) {
        window.open(result.data.url, '_blank')
        toast.success('Download started')
      } else {
        toast.error('Download failed', {
          description: result.error,
        })
      }
    } catch {
      toast.error('Download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleView = async () => {
    if (!evidence) return

    setIsDownloading(true)
    try {
      const result = await getEvidenceDownloadUrlForC3PAO(evidence.id, engagementId)
      if (result.success && result.data) {
        window.open(result.data.url, '_blank')
      } else {
        toast.error('Failed to open file', {
          description: result.error,
        })
      }
    } catch {
      toast.error('Failed to open file')
    } finally {
      setIsDownloading(false)
    }
  }

  if (!evidence) return null

  const isExpired = expirationDate && new Date(expirationDate) < new Date()
  const isExpiringSoon = expirationDate && !isExpired && new Date(expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-muted">
              {getFileIcon(evidence.mimeType, 'lg')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate">{evidence.fileName}</div>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{getFileExtension(evidence.fileName)}</Badge>
                <span>{formatFileSize(evidence.fileSize)}</span>
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => setPreviewOpen(true)} className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" onClick={handleView} disabled={isDownloading} className="flex-1">
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Open in Tab
            </Button>
            <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download
            </Button>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Uploaded</div>
                <div className="font-medium">{format(new Date(evidence.createdAt), 'MMM d, yyyy h:mm a')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">File Size</div>
                <div className="font-medium">{formatFileSize(evidence.fileSize)}</div>
              </div>
            </div>
          </div>

          {expirationDate && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              isExpired
                ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                : isExpiringSoon
                ? 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400'
                : 'bg-muted'
            }`}>
              {(isExpired || isExpiringSoon) && <AlertCircle className="h-4 w-4 shrink-0" />}
              <div className="text-sm">
                {isExpired ? (
                  <>Evidence expired on {format(expirationDate, 'MMM d, yyyy')}</>
                ) : isExpiringSoon ? (
                  <>Evidence expires on {format(expirationDate, 'MMM d, yyyy')}</>
                ) : (
                  <>Expires: {format(expirationDate, 'MMM d, yyyy')}</>
                )}
              </div>
            </div>
          )}

          {evidence.description && (
            <div>
              <div className="text-sm font-medium mb-1">Description</div>
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                {evidence.description}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Linked Controls</div>
              <Badge variant="secondary" className="text-xs">
                {isLoading ? '...' : linkedControls.length}
              </Badge>
            </div>

            {error && (
              <div className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : linkedControls.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {linkedControls.map((control) => (
                  <div
                    key={control.id}
                    className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <Badge variant="outline" className="font-mono shrink-0">
                      {control.controlId}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{control.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {control.familyCode} - {control.familyName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                This evidence is not linked to any controls
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {evidence && (
      <FilePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        engagementId={engagementId}
        evidenceId={evidence.id}
        fileName={evidence.fileName}
        mimeType={evidence.mimeType}
      />
    )}
    </>
  )
}
