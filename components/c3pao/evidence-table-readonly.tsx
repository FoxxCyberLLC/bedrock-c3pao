'use client'

import type React from 'react'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  AlertCircle,
  Download,
  File,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Loader2,
  MoreVertical,
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
import { toast } from 'sonner'
import { getEvidenceDownloadUrlForC3PAO } from '@/app/actions/c3pao-dashboard'
import { triggerFileDownload } from '@/lib/download'
import type { EvidenceView } from '@/lib/api-client'

interface EvidenceTableReadOnlyProps {
  evidence: EvidenceView[]
  engagementId: string
}

function getFileTypeIcon(mimeType: string | null): React.ReactElement {
  if (!mimeType) return <File className="h-4 w-4 text-muted-foreground" />
  if (mimeType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />
  if (mimeType.includes('word') || mimeType.includes('document'))
    return <FileText className="h-4 w-4 text-blue-600" />
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('sheet'))
    return <FileText className="h-4 w-4 text-green-600" />
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />
  if (mimeType.includes('xml') || mimeType.includes('json'))
    return <GitBranch className="h-4 w-4 text-purple-500" />
  return <File className="h-4 w-4 text-muted-foreground" />
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return 'Unknown'
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function isExpiring(expirationDate: string | null): boolean {
  const d = parseDate(expirationDate)
  if (!d) return false
  const daysUntil = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return daysUntil > 0 && daysUntil <= 30
}

function isExpired(expirationDate: string | null): boolean {
  const d = parseDate(expirationDate)
  if (!d) return false
  return d.getTime() < Date.now()
}

export function EvidenceTableReadOnly({ evidence, engagementId }: EvidenceTableReadOnlyProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const sorted = useMemo(
    () =>
      [...evidence].sort((a, b) => {
        const aTime = parseDate(a.uploadedAt)?.getTime() ?? 0
        const bTime = parseDate(b.uploadedAt)?.getTime() ?? 0
        return bTime - aTime
      }),
    [evidence]
  )

  const handleDownload = async (evidenceId: string, fileName: string) => {
    setDownloadingId(evidenceId)
    try {
      const result = await getEvidenceDownloadUrlForC3PAO(evidenceId, engagementId)
      if (result.success && result.data) {
        triggerFileDownload(result.data.url, fileName)
        toast.success('Download started', { description: `Downloading ${fileName}` })
      } else {
        toast.error('Download failed', {
          description: result.error || 'Could not generate download URL',
        })
      }
    } catch (error) {
      console.error('Error downloading evidence:', error)
      toast.error('Download failed', { description: 'An unexpected error occurred' })
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[36px]" />
            <TableHead>Name</TableHead>
            <TableHead className="w-[70px]">Version</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Linked Controls</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead>Expiration</TableHead>
            <TableHead className="w-[60px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((item) => {
            const linkedCount = item.requirementIds?.length ?? 0
            const uploaded = parseDate(item.uploadedAt)
            const expiring = isExpiring(item.expirationDate)
            const expired = isExpired(item.expirationDate)
            const reviewHref = `/engagements/${engagementId}/evidence/${item.id}`

            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center justify-center">
                    {getFileTypeIcon(item.mimeType)}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col">
                    <Link
                      href={reviewHref}
                      className="font-medium text-sm text-primary hover:underline"
                    >
                      {item.fileName}
                    </Link>
                    {item.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {item.description}
                      </span>
                    )}
                    {(expiring || expired) && (
                      <span className="text-xs text-yellow-600 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="h-3 w-3" />
                        {expired ? 'Expired' : 'Expiring soon'}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-sm font-mono text-muted-foreground">
                    v{item.version}
                  </span>
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {formatFileSize(item.fileSize)}
                </TableCell>

                <TableCell>
                  {linkedCount > 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      {linkedCount} control{linkedCount === 1 ? '' : 's'}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not linked</span>
                  )}
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {uploaded ? format(uploaded, 'MMM d, yyyy') : '—'}
                </TableCell>

                <TableCell className="text-sm">
                  {item.expirationDate ? (
                    <span
                      className={
                        expired
                          ? 'text-red-600 font-medium'
                          : expiring
                            ? 'text-yellow-600 font-medium'
                            : 'text-muted-foreground'
                      }
                    >
                      {format(parseDate(item.expirationDate)!, 'MMM d, yyyy')}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={reviewHref}>Open for review</Link>
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
