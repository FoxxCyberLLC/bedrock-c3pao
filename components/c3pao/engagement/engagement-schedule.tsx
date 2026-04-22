'use client'

/**
 * Engagement > Schedule & Logistics subtab. Form-driven view over the
 * single per-engagement schedule row. Lead assessor may edit; everyone
 * else sees read-only values.
 */

import { format } from 'date-fns'
import { Save } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  getEngagementSchedule,
  updateEngagementSchedule,
  type SchedulePatch,
} from '@/app/actions/c3pao-schedule'
import { safeDate } from '@/lib/utils'
import type { EngagementSchedule as EngagementScheduleData } from '@/lib/db-schedule'

export interface EngagementScheduleProps {
  engagementId: string
  initialSchedule?: EngagementScheduleData | null
  isLead: boolean
}

type DateKey =
  | 'kickoffDate'
  | 'onsiteStart'
  | 'onsiteEnd'
  | 'phase1Target'
  | 'phase2Target'
  | 'phase3Target'

type TextKey = 'interviewSchedule' | 'deliverableDueDates' | 'locationNotes'

interface FormState {
  kickoffDate: Date | undefined
  onsiteStart: Date | undefined
  onsiteEnd: Date | undefined
  phase1Target: Date | undefined
  phase2Target: Date | undefined
  phase3Target: Date | undefined
  interviewSchedule: string
  deliverableDueDates: string
  locationNotes: string
}

const DATE_FIELDS: { key: DateKey; label: string }[] = [
  { key: 'kickoffDate', label: 'Kickoff date' },
  { key: 'onsiteStart', label: 'On-site start' },
  { key: 'onsiteEnd', label: 'On-site end' },
  { key: 'phase1Target', label: 'CAP Phase 1 target' },
  { key: 'phase2Target', label: 'CAP Phase 2 target' },
  { key: 'phase3Target', label: 'CAP Phase 3 target' },
]

const TEXT_FIELDS: { key: TextKey; label: string; rows: number }[] = [
  { key: 'interviewSchedule', label: 'Interview schedule', rows: 4 },
  {
    key: 'deliverableDueDates',
    label: 'Deliverable due dates',
    rows: 3,
  },
  { key: 'locationNotes', label: 'Location / access notes', rows: 3 },
]

function buildInitialState(
  schedule: EngagementScheduleData | null | undefined,
): FormState {
  return {
    kickoffDate: safeDate(schedule?.kickoffDate ?? null) ?? undefined,
    onsiteStart: safeDate(schedule?.onsiteStart ?? null) ?? undefined,
    onsiteEnd: safeDate(schedule?.onsiteEnd ?? null) ?? undefined,
    phase1Target: safeDate(schedule?.phase1Target ?? null) ?? undefined,
    phase2Target: safeDate(schedule?.phase2Target ?? null) ?? undefined,
    phase3Target: safeDate(schedule?.phase3Target ?? null) ?? undefined,
    interviewSchedule: schedule?.interviewSchedule ?? '',
    deliverableDueDates: schedule?.deliverableDueDates ?? '',
    locationNotes: schedule?.locationNotes ?? '',
  }
}

function toIsoDate(d: Date | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null
}

function formatDateReadOnly(value: string | null): string {
  const d = safeDate(value)
  return d ? format(d, 'PPP') : '—'
}

export function EngagementSchedule({
  engagementId,
  initialSchedule = null,
  isLead,
}: EngagementScheduleProps): React.ReactElement {
  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(initialSchedule),
  )
  const [schedule, setSchedule] = useState<EngagementScheduleData | null>(
    initialSchedule,
  )
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    async function load(): Promise<void> {
      const result = await getEngagementSchedule(engagementId)
      if (cancelled) return
      if (result.success) {
        setSchedule(result.data ?? null)
        setForm(buildInitialState(result.data ?? null))
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [engagementId])

  function handleDate(key: DateKey, value: Date | undefined): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleText(
    key: TextKey,
    value: string,
  ): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave(): void {
    startTransition(async () => {
      const patch: SchedulePatch = {
        kickoffDate: toIsoDate(form.kickoffDate),
        onsiteStart: toIsoDate(form.onsiteStart),
        onsiteEnd: toIsoDate(form.onsiteEnd),
        phase1Target: toIsoDate(form.phase1Target),
        phase2Target: toIsoDate(form.phase2Target),
        phase3Target: toIsoDate(form.phase3Target),
        interviewSchedule: form.interviewSchedule.trim() || null,
        deliverableDueDates: form.deliverableDueDates.trim() || null,
        locationNotes: form.locationNotes.trim() || null,
      }
      const result = await updateEngagementSchedule(engagementId, patch)
      if (result.success && result.data) {
        setSchedule(result.data)
        setForm(buildInitialState(result.data))
        toast.success('Schedule updated')
      } else {
        toast.error(result.error ?? 'Failed to save schedule')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Schedule &amp; Logistics</CardTitle>
        <CardDescription>
          Kickoff, on-site window, CAP targets, and interview / deliverable
          details for this engagement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLead ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DATE_FIELDS.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`schedule-${f.key}`}>{f.label}</Label>
                  <DatePicker
                    date={form[f.key]}
                    onSelect={(d) => handleDate(f.key, d)}
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {TEXT_FIELDS.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`schedule-${f.key}`}>{f.label}</Label>
                  <Textarea
                    id={`schedule-${f.key}`}
                    data-testid={`schedule-${f.key}`}
                    rows={f.rows}
                    value={form[f.key]}
                    onChange={(e) => handleText(f.key, e.target.value)}
                    disabled={pending}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSave}
                disabled={pending}
                data-testid="schedule-save-button"
              >
                <Save className="h-4 w-4" aria-hidden />
                {pending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {DATE_FIELDS.map((f) => (
                <div key={f.key} className="space-y-0.5">
                  <dt className="text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="text-sm font-medium">
                    {formatDateReadOnly(
                      schedule?.[f.key] ?? null,
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <dl className="grid gap-3 md:grid-cols-3">
              {TEXT_FIELDS.map((f) => {
                const value = schedule?.[f.key] ?? null
                return (
                  <div key={f.key} className="space-y-0.5">
                    <dt className="text-xs text-muted-foreground">{f.label}</dt>
                    <dd className="whitespace-pre-wrap text-sm">
                      {value ?? '—'}
                    </dd>
                  </div>
                )
              })}
            </dl>
            <p className="text-xs text-muted-foreground">
              Only the lead assessor can edit the engagement schedule.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
