'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Loader2, Trash2, Upload, FileText, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { isUploadAllowed } from '@/lib/evidence-mime-types'
import {
  deleteOutsideEvidence,
  listOutsideEvidenceAction,
  uploadOutsideEvidence,
} from '@/app/actions/c3pao-outside-engagement'
import type { EvidenceView } from '@/lib/api-client'

const MAX_BYTES = 25 * 1024 * 1024

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i += 1
  }
  return `${size.toFixed(1)} ${units[i]}`
}

interface OutsideEvidencePanelProps {
  engagementId: string
}

export function OutsideEvidencePanel({ engagementId }: OutsideEvidencePanelProps) {
  const [items, setItems] = useState<EvidenceView[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, startUpload] = useTransition()
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    const result = await listOutsideEvidenceAction(engagementId)
    if (result.success && result.data) {
      setItems(result.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // refresh exists in scope; intentional one-shot effect on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setClientError(null)
    const next = e.target.files?.[0] ?? null
    if (!next) {
      setFile(null)
      return
    }
    if (next.size > MAX_BYTES) {
      setClientError('File exceeds the 25MB limit.')
      return
    }
    if (!isUploadAllowed(next.type)) {
      setClientError(`Mime type ${next.type || 'unknown'} is not allowed.`)
      return
    }
    setFile(next)
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) {
      setClientError('Pick a file first.')
      return
    }
    startUpload(async () => {
      const fd = new FormData()
      fd.set('file', file)
      if (description) fd.set('description', description)
      const result = await uploadOutsideEvidence(engagementId, fd)
      if (!result.success) {
        toast.error(result.error ?? 'Upload failed')
        return
      }
      toast.success('Evidence uploaded')
      setFile(null)
      setDescription('')
      // Reset the hidden input element value so the same file can be re-picked.
      const inputEl = document.querySelector<HTMLInputElement>(
        'input[type="file"][data-outside-evidence]',
      )
      if (inputEl) inputEl.value = ''
      await refresh()
    })
  }

  async function onDelete(id: string) {
    const result = await deleteOutsideEvidence(engagementId, id)
    if (!result.success) {
      toast.error(result.error ?? 'Delete failed')
      return
    }
    toast.success('Evidence deleted')
    await refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
          Local Evidence
        </CardTitle>
        <CardDescription>
          Upload evidence for this outside engagement. Stored as a BYTEA blob
          in the c3pao local Postgres; never synced to bedrock-cmmc. Max 25MB
          per file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-3 rounded-md border p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="outside-evidence-file">File</Label>
              <Input
                id="outside-evidence-file"
                data-outside-evidence
                type="file"
                onChange={onFileChange}
                disabled={uploading}
                aria-describedby="outside-evidence-help"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="outside-evidence-desc">Description (optional)</Label>
              <Textarea
                id="outside-evidence-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of what this evidence demonstrates..."
                disabled={uploading}
              />
            </div>
          </div>
          {clientError && (
            <p
              className="flex items-center gap-1.5 text-xs text-red-600"
              role="alert"
            >
              <AlertCircle className="h-3 w-3" aria-hidden />
              {clientError}
            </p>
          )}
          <div className="flex items-center justify-between">
            <p
              id="outside-evidence-help"
              className="text-xs text-muted-foreground"
            >
              Allowed: PDF, common image formats, Office docs, CSV, plain text.
            </p>
            <Button type="submit" size="sm" disabled={!file || uploading}>
              {uploading ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Upload className="mr-2 h-3 w-3" aria-hidden />
              )}
              Upload
            </Button>
          </div>
        </form>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Loading evidence…
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No evidence uploaded yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead className="w-[120px] text-right">Size</TableHead>
                <TableHead className="w-[160px]">Uploaded</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell>
                    <Link
                      href={`/engagements/${engagementId}/evidence/${ev.id}`}
                      className="font-medium hover:underline"
                    >
                      {ev.fileName}
                    </Link>
                    {ev.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {ev.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatBytes(ev.fileSize)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(ev.uploadedAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${ev.fileName}`}
                      onClick={() => onDelete(ev.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
