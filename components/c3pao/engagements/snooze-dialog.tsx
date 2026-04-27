'use client'

import { useState } from 'react'
import { addDays, addMonths, addWeeks } from 'date-fns'
import { Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import { snoozeEngagement } from '@/app/actions/c3pao-personal-views'

interface SnoozeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  engagementId: string
  /** Used in the dialog body, e.g., the contractor org name. */
  engagementLabel: string
  onSuccess: () => void
}

interface QuickPick {
  key: string
  label: string
  resolve: (now: Date) => Date
}

const QUICK_PICKS: ReadonlyArray<QuickPick> = [
  { key: '1d', label: '1 day', resolve: (now) => addDays(now, 1) },
  { key: '3d', label: '3 days', resolve: (now) => addDays(now, 3) },
  { key: '1w', label: '1 week', resolve: (now) => addWeeks(now, 1) },
  { key: '2w', label: '2 weeks', resolve: (now) => addWeeks(now, 2) },
  { key: '1mo', label: '1 month', resolve: (now) => addMonths(now, 1) },
]

/**
 * Snooze dialog — temporarily hides an engagement from the user's default
 * view. Quick-pick durations resolve relative to the current clock; users
 * can also pick a specific date and add an optional note.
 */
export function SnoozeDialog({
  open,
  onOpenChange,
  engagementId,
  engagementLabel,
  onSuccess,
}: SnoozeDialogProps) {
  const [selectedKey, setSelectedKey] = useState<string>('1w')
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function resolveHiddenUntil(): Date | null {
    if (selectedKey === 'custom') {
      return customDate ?? null
    }
    const pick = QUICK_PICKS.find((p) => p.key === selectedKey)
    if (!pick) return null
    return pick.resolve(new Date())
  }

  const hiddenUntil = resolveHiddenUntil()
  const canSave = hiddenUntil !== null && !submitting

  async function handleSave(): Promise<void> {
    if (!hiddenUntil) return
    setSubmitting(true)
    try {
      const trimmedReason = reason.trim()
      const result = await snoozeEngagement(
        engagementId,
        hiddenUntil.toISOString(),
        trimmedReason.length > 0 ? trimmedReason : undefined,
      )
      if (result.success) {
        toast.success(`Snoozed until ${hiddenUntil.toLocaleDateString()}`)
        onSuccess()
        setSelectedKey('1w')
        setCustomDate(undefined)
        setReason('')
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to snooze engagement')
      }
    } catch {
      toast.error('Failed to snooze engagement')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Snooze engagement
          </DialogTitle>
          <DialogDescription>
            Hide <strong>{engagementLabel}</strong> from your default list until later. Only you
            see snoozes — your team is unaffected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Hide until</Label>
            <div role="radiogroup" aria-label="Snooze duration" className="flex flex-wrap gap-1.5">
              {QUICK_PICKS.map((p) => {
                const selected = selectedKey === p.key
                return (
                  <button
                    key={p.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setSelectedKey(p.key)
                      setCustomDate(undefined)
                    }}
                    className={cn(
                      'inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-colors',
                      selected
                        ? 'border-transparent bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:bg-accent',
                    )}
                  >
                    {p.label}
                  </button>
                )
              })}
              <button
                type="button"
                role="radio"
                aria-checked={selectedKey === 'custom'}
                onClick={() => setSelectedKey('custom')}
                className={cn(
                  'inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-colors',
                  selectedKey === 'custom'
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-accent',
                )}
              >
                Custom date
              </button>
            </div>
            {selectedKey === 'custom' && (
              <div className="pt-1">
                <DatePicker
                  date={customDate}
                  onSelect={setCustomDate}
                  fromDate={addDays(new Date(), 1)}
                  placeholder="Pick a date"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="snooze-reason">Reason (optional)</Label>
            <Textarea
              id="snooze-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., waiting on client to provide evidence"
              rows={2}
              maxLength={200}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Snoozing...
                </>
              ) : (
                'Snooze'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
