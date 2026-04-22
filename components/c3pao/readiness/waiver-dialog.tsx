'use client'

/**
 * Modal for granting a readiness-item waiver. Requires a reason ≥ 20
 * characters (matches server validation) and surfaces the typical waiver
 * reason as placeholder hint text.
 */

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { READINESS_ITEM_DEFINITIONS } from '@/lib/readiness-items'
import type { ReadinessItemKey } from '@/lib/readiness-types'

const WAIVER_REASON_MIN_LENGTH = 20

export interface WaiverDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemKey: ReadinessItemKey
  onSubmit: (reason: string) => Promise<void> | void
  pending?: boolean
}

export function WaiverDialog({
  open,
  onOpenChange,
  itemKey,
  onSubmit,
  pending = false,
}: WaiverDialogProps): React.ReactElement {
  const def = READINESS_ITEM_DEFINITIONS[itemKey]
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setReason('')
      setTouched(false)
    }
    onOpenChange(next)
  }

  const trimmed = reason.trim()
  const tooShort = trimmed.length < WAIVER_REASON_MIN_LENGTH
  const showError = touched && tooShort

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (tooShort) return
    await onSubmit(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Waive: {def.title}</DialogTitle>
          <DialogDescription>
            Granting a waiver replaces the requirement to mark this item
            complete. A reason is required for the audit record.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="waiver-reason">
              Reason for waiver
              <span className="ml-1 text-destructive" aria-hidden>
                *
              </span>
            </Label>
            <Textarea
              id="waiver-reason"
              data-testid="waiver-reason-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={def.typicalWaiverReason}
              rows={4}
              aria-invalid={showError || undefined}
              aria-describedby="waiver-reason-help"
              disabled={pending}
            />
            <div
              id="waiver-reason-help"
              className="flex items-center justify-between text-xs"
            >
              <span
                className={
                  showError ? 'text-destructive' : 'text-muted-foreground'
                }
              >
                {showError
                  ? `Reason must be at least ${WAIVER_REASON_MIN_LENGTH} characters.`
                  : `Minimum ${WAIVER_REASON_MIN_LENGTH} characters.`}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {trimmed.length}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || tooShort}>
              {pending ? 'Waiving…' : 'Grant waiver'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
