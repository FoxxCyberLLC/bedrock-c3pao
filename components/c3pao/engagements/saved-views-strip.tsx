'use client'

import { useState } from 'react'
import { Bookmark, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SavedView } from '@/lib/personal-views-types'

interface SavedViewsStripProps {
  views: SavedView[]
  activeViewId: string | null
  onSelect: (id: string | null) => void
  /** Wrapper around the delete server action — should throw on error. */
  onDelete: (id: string) => Promise<void>
}

/**
 * Horizontal scroll-friendly strip of saved-view chips. The active view is
 * solid; others are outlined. Each non-active chip exposes an × button on
 * hover that triggers a confirm dialog before calling `onDelete`.
 */
export function SavedViewsStrip({
  views,
  activeViewId,
  onSelect,
  onDelete,
}: SavedViewsStripProps) {
  const [pendingDelete, setPendingDelete] = useState<SavedView | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (views.length === 0) return null

  async function handleConfirmDelete(): Promise<void> {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await onDelete(pendingDelete.id)
      toast.success(`Deleted view "${pendingDelete.name}"`)
      if (pendingDelete.id === activeViewId) onSelect(null)
      setPendingDelete(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete view')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5" aria-label="Saved views">
        {views.map((view) => {
          const isActive = view.id === activeViewId
          return (
            <div key={view.id} className="group relative">
              <Button
                type="button"
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                onClick={() => onSelect(isActive ? null : view.id)}
                className={cn('h-7 gap-1.5 pr-7 pl-2.5 text-xs')}
              >
                <Bookmark className="h-3 w-3" aria-hidden="true" />
                <span className="max-w-[140px] truncate">{view.name}</span>
              </Button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setPendingDelete(view)
                }}
                aria-label={`Delete view ${view.name}`}
                className={cn(
                  'absolute right-1 top-1/2 -translate-y-1/2',
                  'inline-flex h-4 w-4 items-center justify-center rounded-full',
                  'opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100',
                  isActive
                    ? 'text-primary-foreground hover:bg-primary-foreground/20'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && !deleting && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved view?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `"${pendingDelete.name}" will be removed from your saved views. This can't be undone.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={deleting}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
