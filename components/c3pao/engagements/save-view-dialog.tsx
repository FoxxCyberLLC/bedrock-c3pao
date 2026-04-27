'use client'

import { useState } from 'react'
import { Bookmark, Loader2 } from 'lucide-react'
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
import type {
  SavedView,
  SavedViewFilter,
} from '@/lib/personal-views-types'
import { createSavedViewAction } from '@/app/actions/c3pao-personal-views'

interface SaveViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The current filter state to persist. */
  currentFilter: SavedViewFilter
  /** Pretty summary of what's being saved. */
  filterSummary: string
  onSuccess: (newView: SavedView) => void
}

/**
 * Dialog for naming a saved view that bundles the current filter state.
 * Saved views are private to the user.
 */
export function SaveViewDialog({
  open,
  onOpenChange,
  currentFilter,
  filterSummary,
  onSuccess,
}: SaveViewDialogProps) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && !submitting

  async function handleSave(): Promise<void> {
    if (!canSave) return
    setSubmitting(true)
    try {
      const result = await createSavedViewAction(trimmed, currentFilter)
      if (result.success && result.data) {
        toast.success(`Saved view "${trimmed}"`)
        onSuccess(result.data)
        setName('')
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to save view')
      }
    } catch {
      toast.error('Failed to save view')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Save filter view
          </DialogTitle>
          <DialogDescription>
            Saved views are private to you and reapply this exact filter combination with one click.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="view-name">Name</Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My active reports"
              maxLength={60}
              autoFocus
            />
          </div>

          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Filters
            </p>
            <p className="mt-1 text-xs text-foreground">{filterSummary}</p>
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
