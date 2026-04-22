'use client'

/**
 * Bottom-bar "Start Assessment" button. Disabled until all 8 readiness
 * items are complete or waived, and only actionable by the lead assessor.
 * Calls the server action, refreshes the route on success.
 */

import { ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { startAssessment } from '@/app/actions/c3pao-readiness'

export interface StartAssessmentButtonProps {
  engagementId: string
  canStart: boolean
  isLead: boolean
  progress: { completed: number; total: number }
}

export function StartAssessmentButton({
  engagementId,
  canStart,
  isLead,
  progress,
}: StartAssessmentButtonProps): React.ReactElement {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const leadBlocked = !isLead
  const notReady = !canStart
  const disabled = leadBlocked || notReady || pending

  const helperText = leadBlocked
    ? 'Only the lead assessor can start the assessment.'
    : notReady
      ? `Complete all ${progress.total} items to unlock (${progress.completed}/${progress.total})`
      : 'All readiness items are complete — you may start the assessment.'

  function handleClick() {
    startTransition(async () => {
      const result = await startAssessment(engagementId)
      if (result.success) {
        toast.success('Assessment started')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to start assessment')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p
        className="text-sm text-muted-foreground"
        data-testid="start-assessment-helper"
      >
        {helperText}
      </p>
      <Button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        data-testid="start-assessment-button"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <ArrowRight className="h-4 w-4" aria-hidden />
        )}
        Start Assessment
      </Button>
    </div>
  )
}
