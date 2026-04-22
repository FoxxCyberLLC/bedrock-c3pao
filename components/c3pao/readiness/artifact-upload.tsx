'use client'

/**
 * Artifact drag-drop + list for a single readiness item. Handles
 * client-side size validation (50 MB), mime type allowlist, and calls the
 * `uploadArtifact` / `removeArtifact` server actions. Hidden when
 * `disabled` (e.g. the item has been waived).
 */

import { format } from 'date-fns'
import { Download, File as FileIcon, Loader2, Trash2, UploadCloud } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { safeDate } from '@/lib/utils'
import {
  removeArtifact as removeArtifactAction,
  uploadArtifact as uploadArtifactAction,
} from '@/app/actions/c3pao-readiness'
import type { ReadinessArtifact, ReadinessItemKey } from '@/lib/readiness-types'

const MAX_ARTIFACT_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_MIME_TYPES = new Set<string>([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
])

export interface ArtifactUploadProps {
  engagementId: string
  itemKey: ReadinessItemKey
  artifacts: ReadinessArtifact[]
  canDelete: (artifact: ReadinessArtifact) => boolean
  disabled?: boolean
  onChange?: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateFile(file: File): string | null {
  if (file.size === 0) return 'File is empty'
  if (file.size > MAX_ARTIFACT_BYTES) {
    return `File exceeds ${MAX_ARTIFACT_BYTES / (1024 * 1024)} MB limit`
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return `Unsupported file type: ${file.type || 'unknown'}`
  }
  return null
}

export function ArtifactUpload({
  engagementId,
  itemKey,
  artifacts,
  canDelete,
  disabled = false,
  onChange,
}: ArtifactUploadProps): React.ReactElement | null {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [pending, startTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)

  if (disabled) return null

  function handleFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    const err = validateFile(file)
    if (err) {
      toast.error(err)
      return
    }
    const formData = new FormData()
    formData.set('file', file)
    startTransition(async () => {
      const result = await uploadArtifactAction(engagementId, itemKey, formData)
      if (result.success) {
        toast.success(`Uploaded ${file.name}`)
        onChange?.()
      } else {
        toast.error(result.error ?? 'Upload failed')
      }
    })
  }

  async function handleRemove(artifact: ReadinessArtifact) {
    setRemovingId(artifact.id)
    try {
      const result = await removeArtifactAction(
        engagementId,
        itemKey,
        artifact.id,
      )
      if (result.success) {
        toast.success(`Removed ${artifact.filename}`)
        onChange?.()
      } else {
        toast.error(result.error ?? 'Failed to remove artifact')
      }
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/60 hover:bg-muted/40',
          pending && 'opacity-60',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          data-testid="artifact-file-input"
          disabled={pending}
          onChange={(e) => {
            handleFiles(e.target.files)
            if (inputRef.current) inputRef.current.value = ''
          }}
        />
        {pending ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          <UploadCloud className="h-6 w-6 text-muted-foreground" aria-hidden />
        )}
        <p className="text-sm font-medium">
          {pending ? 'Uploading…' : 'Drag and drop a file, or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, images, Word, Excel, text, CSV — up to 50 MB
        </p>
      </label>

      {artifacts.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No artifacts uploaded yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {artifacts.map((a) => {
            const when = safeDate(a.uploadedAt)
            const whenText = when ? format(when, 'MMM d, yyyy p') : a.uploadedAt
            const allowDelete = canDelete(a)
            return (
              <li
                key={a.id}
                className="flex items-start gap-3 rounded-md border bg-card px-3 py-2"
              >
                <FileIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(a.sizeBytes)} · {a.uploadedBy} · {whenText}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    aria-label={`Download ${a.filename}`}
                  >
                    <a
                      href={`/api/c3pao/readiness/artifact/${a.id}`}
                      download={a.filename}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  {allowDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${a.filename}`}
                      disabled={removingId === a.id}
                      onClick={() => handleRemove(a)}
                    >
                      {removingId === a.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
