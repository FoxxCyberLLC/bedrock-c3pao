'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  TAG_COLORS,
  type EngagementTag,
  type TagColor,
} from '@/lib/personal-views-types'
import { addEngagementTag } from '@/app/actions/c3pao-personal-views'
import { TAG_COLOR_CLASSES } from './tag-color-classes'

interface AddTagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  engagementId: string
  /** Existing labels for autocomplete suggestion. */
  suggestions: string[]
  onSuccess: (newTag: EngagementTag) => void
}

/**
 * Dialog for adding a new tag to an engagement. User picks a label (with
 * existing labels offered as quick-pick chips) and a color, then saves.
 */
export function AddTagDialog({
  open,
  onOpenChange,
  engagementId,
  suggestions,
  onSuccess,
}: AddTagDialogProps) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState<TagColor>('sky')
  const [submitting, setSubmitting] = useState(false)

  const trimmed = label.trim()
  const canSave = trimmed.length > 0 && !submitting

  async function handleSave(): Promise<void> {
    if (!canSave) return
    setSubmitting(true)
    try {
      const result = await addEngagementTag(engagementId, trimmed, color)
      if (result.success && result.data) {
        toast.success(`Tag "${trimmed}" added`)
        onSuccess(result.data)
        setLabel('')
        setColor('sky')
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to add tag')
      }
    } catch {
      toast.error('Failed to add tag')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add tag
          </DialogTitle>
          <DialogDescription>
            Tags are visible to your whole team and can be filtered from the engagements list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {suggestions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Existing tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setLabel(s)}
                    className="inline-flex h-6 items-center rounded-full border border-border bg-background px-2 text-xs hover:bg-accent hover:text-accent-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="tag-label">Label</Label>
            <Input
              id="tag-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., on-site"
              maxLength={40}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div role="radiogroup" aria-label="Tag color" className="flex flex-wrap gap-2">
              {TAG_COLORS.map((c) => {
                const palette = TAG_COLOR_CLASSES[c]
                const selected = c === color
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`Color ${c}`}
                    onClick={() => setColor(c)}
                    className={cn(
                      'inline-flex h-7 w-7 items-center justify-center rounded-full border transition-all',
                      palette.chip,
                      selected
                        ? 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                        : 'opacity-80 hover:opacity-100',
                    )}
                  >
                    <span className={cn('h-2.5 w-2.5 rounded-full', palette.dot)} aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
