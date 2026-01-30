'use client'

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
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ConflictDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lastModifiedBy: string
  onRefresh: () => void
}

export function ConflictDialog({
  open,
  onOpenChange,
  lastModifiedBy,
  onRefresh,
}: ConflictDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Save Conflict Detected
          </AlertDialogTitle>
          <AlertDialogDescription>
            This item was modified by <strong>{lastModifiedBy}</strong> while you were editing.
            Your changes could not be saved to prevent overwriting their work.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Please refresh the page to see the latest changes. You may need to re-enter your modifications.
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Dismiss</AlertDialogCancel>
          <AlertDialogAction onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
