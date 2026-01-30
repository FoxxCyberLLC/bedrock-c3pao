'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Shield, Lock, Unlock, Loader2, Building2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { toggleAssessmentMode } from '@/app/actions/assessment-mode'
import { toast } from 'sonner'

interface AssessmentModeIndicatorProps {
  active: boolean
  customerName: string
  packageName: string
  engagementId: string
  startedAt?: Date
  isLeadAssessor: boolean
  onToggle?: () => void
}

export function AssessmentModeIndicator({
  active,
  customerName,
  packageName,
  engagementId,
  startedAt,
  isLeadAssessor,
  onToggle,
}: AssessmentModeIndicatorProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showPauseDialog, setShowPauseDialog] = useState(false)
  const [showResumeDialog, setShowResumeDialog] = useState(false)

  const handleToggle = async (newActive: boolean) => {
    setIsUpdating(true)
    try {
      const result = await toggleAssessmentMode(engagementId, newActive)
      if (result.success) {
        toast.success(
          newActive
            ? 'Assessment mode activated - Customer package is now read-only'
            : 'Assessment mode paused - Customer can make changes'
        )
        onToggle?.()
      } else {
        toast.error(result.error || 'Failed to update assessment mode')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setIsUpdating(false)
      setShowPauseDialog(false)
      setShowResumeDialog(false)
    }
  }

  if (active) {
    return (
      <>
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-emerald-500/10">
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                    Live Assessment Mode
                  </h3>
                  <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white animate-pulse">
                    ACTIVE
                  </Badge>
                </div>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  <span className="font-medium">{customerName}</span>&apos;s package &ldquo;{packageName}&rdquo; is locked to read-only.
                </p>
                {startedAt && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    Started {formatDistanceToNow(startedAt, { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
            {isLeadAssessor && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPauseDialog(true)}
                disabled={isUpdating}
                className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Unlock className="h-4 w-4 mr-1" />
                )}
                Pause Lock
              </Button>
            )}
          </div>
        </div>

        <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Pause Assessment Mode?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                This will temporarily allow <span className="font-medium">{customerName}</span> to make changes to their package.
                <br /><br />
                Only pause if absolutely necessary (e.g., customer needs to upload a missing document).
                You can re-enable the lock at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleToggle(false)}
                className="bg-amber-500 hover:bg-amber-600"
              >
                Pause Lock
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // Assessment mode is paused/inactive
  return (
    <>
      <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-500/10">
              <Unlock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                  Assessment Mode Paused
                </h3>
                <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-300">
                  UNLOCKED
                </Badge>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Customer can currently make changes to their package.
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Re-enable the lock before continuing assessment to ensure data integrity.
              </p>
            </div>
          </div>
          {isLeadAssessor && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResumeDialog(true)}
              disabled={isUpdating}
              className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Lock className="h-4 w-4 mr-1" />
              )}
              Resume Lock
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-500" />
              Resume Assessment Mode?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              This will lock <span className="font-medium">{customerName}</span>&apos;s package to read-only mode again.
              <br /><br />
              The customer will see a banner notifying them that assessment is in progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleToggle(true)}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              Resume Lock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
