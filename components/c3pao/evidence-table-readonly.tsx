'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { safeDate } from '@/lib/utils'
import {
  Download,
  FileText,
  AlertCircle,
  MoreVertical,
  ExternalLink,
  Loader2,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { getEvidenceDownloadUrlForC3PAO } from '@/app/actions/c3pao-dashboard'

interface LinkedRequirement {
  id: string
  requirementId: string
  title: string
  family: {
    code: string
    name: string
  }
}

interface LinkedRequirementStatus {
  id: string
  requirement: LinkedRequirement
}

interface EvidenceWithRelations {
  id: string
  fileName: string
  description: string | null
  mimeType: string | null
  fileSize: number | null
  uploadedAt: Date
  expirationDate: Date | null
  requirementStatuses: LinkedRequirementStatus[]
}

interface EvidenceTableReadOnlyProps {
  evidence: EvidenceWithRelations[]
  engagementId: string
}

export function EvidenceTableReadOnly({ evidence, engagementId }: EvidenceTableReadOnlyProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceWithRelations | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const handleDownload = async (evidenceId: string, fileName: string) => {
    setDownloadingId(evidenceId)
    try {
      const result = await getEvidenceDownloadUrlForC3PAO(evidenceId, engagementId)
      if (result.success && result.data) {
        window.open(result.data.url, '_blank')
        toast.success('Download Started', {
          description: `Downloading ${fileName}`,
        })
      } else {
        toast.error('Download Failed', {
          description: result.error || 'Could not generate download URL',
        })
      }
    } catch (error) {
      console.error('Error downloading evidence:', error)
      toast.error('Download Failed', {
        description: 'An unexpected error occurred',
      })
    } finally {
      setDownloadingId(null)
    }
  }

  const handleViewDetails = (item: EvidenceWithRelations) => {
    setSelectedEvidence(item)
    setDetailsOpen(true)
  }

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown'
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileTypeIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileText className="h-4 w-4" />
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />
    if (mimeType.includes('word')) return <FileText className="h-4 w-4 text-blue-600" />
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileText className="h-4 w-4 text-green-500" />
    if (mimeType.includes('image')) return <FileText className="h-4 w-4 text-blue-500" />
    return <FileText className="h-4 w-4" />
  }

  const isExpiring = (expirationDate: Date | null): boolean => {
    const d = safeDate(expirationDate)
    if (!d) return false
    const daysUntilExpiration = Math.ceil(
      (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    return daysUntilExpiration <= 30 && daysUntilExpiration > 0
  }

  const isExpired = (expirationDate: Date | null): boolean => {
    const d = safeDate(expirationDate)
    if (!d) return false
    return d < new Date()
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Type</TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Linked Controls</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evidence.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center justify-center">
                    {getFileTypeIcon(item.mimeType)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{item.fileName}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {item.description}
                      </span>
                    )}
                    {(isExpiring(item.expirationDate) || isExpired(item.expirationDate)) && (
                      <span className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        {isExpired(item.expirationDate) ? 'Expired' : 'Expiring soon'}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatFileSize(item.fileSize)}
                </TableCell>
                <TableCell>
                  {item.requirementStatuses.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.requirementStatuses.slice(0, 2).map((rs) => (
                        <Badge key={rs.id} variant="secondary" className="text-xs">
                          {rs.requirement.requirementId}
                        </Badge>
                      ))}
                      {item.requirementStatuses.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.requirementStatuses.length - 2}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not linked</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {safeDate(item.uploadedAt) ? format(safeDate(item.uploadedAt)!, 'MMM d, yyyy') : '—'}
                </TableCell>
                <TableCell className="text-sm">
                  {safeDate(item.expirationDate) ? (
                    <span
                      className={
                        isExpired(item.expirationDate)
                          ? 'text-red-600 font-medium'
                          : isExpiring(item.expirationDate)
                          ? 'text-yellow-600 font-medium'
                          : 'text-muted-foreground'
                      }
                    >
                      {format(safeDate(item.expirationDate)!, 'MMM d, yyyy')}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No expiration</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleViewDetails(item)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownload(item.id, item.fileName)}
                        disabled={downloadingId === item.id}
                      >
                        {downloadingId === item.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownload(item.id, item.fileName)}
                        disabled={downloadingId === item.id}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open in Browser
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="text-2xl">
                {selectedEvidence && getFileTypeIcon(selectedEvidence.mimeType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate">{selectedEvidence?.fileName}</div>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <span>{formatFileSize(selectedEvidence?.fileSize || null)}</span>
                  {selectedEvidence?.uploadedAt && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span>Uploaded {safeDate(selectedEvidence.uploadedAt) ? format(safeDate(selectedEvidence.uploadedAt)!, 'MMM d, yyyy h:mm a') : '—'}</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedEvidence && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDownload(selectedEvidence.id, selectedEvidence.fileName)}
                  disabled={downloadingId === selectedEvidence.id}
                  className="flex-1"
                >
                  {downloadingId === selectedEvidence.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-2 h-4 w-4" />
                  )}
                  View in Browser
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownload(selectedEvidence.id, selectedEvidence.fileName)}
                  disabled={downloadingId === selectedEvidence.id}
                  className="flex-1"
                >
                  {downloadingId === selectedEvidence.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download
                </Button>
              </div>

              <Separator />

              {selectedEvidence.expirationDate && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  isExpired(selectedEvidence.expirationDate)
                    ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                    : isExpiring(selectedEvidence.expirationDate)
                    ? 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400'
                    : 'bg-muted'
                }`}>
                  {(isExpired(selectedEvidence.expirationDate) || isExpiring(selectedEvidence.expirationDate)) && (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <div className="text-sm">
                    {isExpired(selectedEvidence.expirationDate) ? (
                      <>Evidence expired on {safeDate(selectedEvidence.expirationDate) ? format(safeDate(selectedEvidence.expirationDate)!, 'MMM d, yyyy') : '—'}</>
                    ) : isExpiring(selectedEvidence.expirationDate) ? (
                      <>Evidence expires on {safeDate(selectedEvidence.expirationDate) ? format(safeDate(selectedEvidence.expirationDate)!, 'MMM d, yyyy') : '—'}</>
                    ) : (
                      <>Expires: {safeDate(selectedEvidence.expirationDate) ? format(safeDate(selectedEvidence.expirationDate)!, 'MMM d, yyyy') : '—'}</>
                    )}
                  </div>
                </div>
              )}

              {selectedEvidence.description && (
                <div>
                  <div className="text-sm font-medium mb-1">Description</div>
                  <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    {selectedEvidence.description}
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-sm font-medium">Linked Controls</div>
                  <Badge variant="secondary" className="text-xs">
                    {selectedEvidence.requirementStatuses.length}
                  </Badge>
                </div>

                {selectedEvidence.requirementStatuses.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedEvidence.requirementStatuses.map((rs) => (
                      <div
                        key={rs.id}
                        className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <Badge variant="outline" className="font-mono shrink-0">
                          {rs.requirement.requirementId}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{rs.requirement.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {rs.requirement.family.code} - {rs.requirement.family.name}
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
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
