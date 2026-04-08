'use client'

/**
 * CAP v2.0 pre-assessment readiness workspace.
 *
 * Replaces the Planning tab on the engagement detail page. Renders an
 * 8-item checklist covering CAP Preliminary Proceedings + Phase 1. The
 * Advance-to-Phase-2 button is disabled until all items are complete.
 *
 * Item mapping (aligned with PreAssessChecklist from the Go API):
 *   1. Contract Executed         — manual toggle (lead only)
 *   2. SSP Reviewed              — derived from SSP row existence
 *   3. BoE Confirmed             — derived from evidence + assets count > 0
 *   4. COI Cleared               — derived from COI disclosures (Task 10)
 *   5. Team Composed             — derived from team count ≥ 1 + lead set
 *   6. Pre-Assess Form Drafted   — manual toggle (lead only)
 *   7. Pre-Assess Form QA'd      — manual select (PENDING / APPROVED)
 *   8. Pre-Assess Form Uploaded  — manual toggle (lead only)
 */

import { useEffect, useState, useTransition } from 'react'
import { format } from 'date-fns'
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  FileCheck,
  FileText,
  Loader2,
  Shield,
  UploadCloud,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { safeDate } from '@/lib/utils'
import {
  getPreAssessChecklist,
  updatePreAssessChecklist,
} from '@/app/actions/c3pao-preassess'
import { updateEngagementPhase } from '@/app/actions/c3pao-phase'
import type { PreAssessChecklist } from '@/lib/api-client'

interface PreAssessmentWorkspaceProps {
  engagementId: string
  isLeadAssessor: boolean
}

interface ChecklistItemProps {
  icon: React.ReactNode
  title: string
  description: string
  complete: boolean
  /** Rendered trailing action (toggle, dropdown). Null if derived. */
  action?: React.ReactNode
}

function ChecklistItem({
  icon,
  title,
  description,
  complete,
  action,
}: ChecklistItemProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3',
        complete
          ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
          : 'bg-muted/20',
      )}
    >
      <div className="mt-0.5">
        {complete ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground/40" aria-hidden="true" />
        )}
      </div>
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

export function PreAssessmentWorkspace({
  engagementId,
  isLeadAssessor,
}: PreAssessmentWorkspaceProps) {
  const [checklist, setChecklist] = useState<PreAssessChecklist | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isAdvancing, startAdvanceTransition] = useTransition()

  // Initial fetch
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const result = await getPreAssessChecklist(engagementId)
      if (cancelled) return
      if (result.success && result.data) {
        setChecklist(result.data)
        setError(null)
      } else {
        setError(result.error ?? 'Failed to load checklist')
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [engagementId])

  const applyUpdate = (input: Parameters<typeof updatePreAssessChecklist>[1]) => {
    startTransition(async () => {
      const result = await updatePreAssessChecklist(engagementId, input)
      if (result.success && result.data) {
        setChecklist(result.data)
      } else {
        toast.error(result.error ?? 'Failed to update checklist')
      }
    })
  }

  const handleAdvance = () => {
    startAdvanceTransition(async () => {
      const result = await updateEngagementPhase(engagementId, 'ASSESS')
      if (result.success) {
        toast.success('Advanced to Phase 2 — Assess')
      } else {
        toast.error(result.error ?? 'Failed to advance phase')
      }
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !checklist) {
    return (
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
        <CardContent className="flex items-start gap-3 py-6">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
          <div>
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
              Unable to load pre-assessment checklist
            </p>
            <p className="mt-0.5 text-xs text-orange-800 dark:text-orange-300">
              {error}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const canEdit = isLeadAssessor
  const completedCount = [
    checklist.contractExecutedAt !== null,
    checklist.sspReviewed,
    checklist.boeConfirmed,
    checklist.coiCleared,
    checklist.teamComposed,
    checklist.preAssessFormDrafted,
    checklist.preAssessFormQaStatus === 'APPROVED',
    checklist.preAssessFormUploadedAt !== null,
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Pre-Assessment Readiness</CardTitle>
              <CardDescription>
                CAP v2.0 Phase 1 checklist · complete all 8 items to advance to
                Phase 2 (Assess)
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-semibold tabular-nums">
                  {completedCount}
                  <span className="text-sm font-normal text-muted-foreground">
                    /8
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">items complete</p>
              </div>
              <Button
                type="button"
                onClick={handleAdvance}
                disabled={
                  !canEdit || !checklist.allItemsComplete || isAdvancing
                }
                title={
                  !checklist.allItemsComplete
                    ? 'All 8 checklist items must be complete'
                    : 'Advance to Phase 2'
                }
              >
                {isAdvancing && <Loader2 className="h-4 w-4 animate-spin" />}
                Advance to Phase 2
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(completedCount / 8) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Checklist items */}
      <div className="grid gap-3 lg:grid-cols-2">
        <ChecklistItem
          icon={<FileCheck className="h-4 w-4" />}
          title="Contractual Agreement Executed"
          description={
            checklist.contractExecutedAt
              ? `Marked executed on ${format(
                  safeDate(checklist.contractExecutedAt) ?? new Date(),
                  'PPP',
                )}`
              : 'CAP Preliminary Proceedings requirement'
          }
          complete={checklist.contractExecutedAt !== null}
          action={
            canEdit ? (
              <Button
                type="button"
                size="sm"
                variant={checklist.contractExecutedAt ? 'outline' : 'default'}
                disabled={isPending}
                onClick={() =>
                  applyUpdate({
                    contractExecutedAt: checklist.contractExecutedAt
                      ? null
                      : new Date().toISOString(),
                  })
                }
              >
                {checklist.contractExecutedAt ? 'Clear' : 'Mark Executed'}
              </Button>
            ) : undefined
          }
        />

        <ChecklistItem
          icon={<FileText className="h-4 w-4" />}
          title="SSP Reviewed"
          description={
            checklist.sspReviewed
              ? 'System Security Plan available for review'
              : 'Awaiting OSC to publish the SSP'
          }
          complete={checklist.sspReviewed}
        />

        <ChecklistItem
          icon={<Shield className="h-4 w-4" />}
          title="Body of Evidence Confirmed"
          description={
            checklist.boeConfirmed
              ? 'Evidence + assets inventory present'
              : 'Evidence and asset inventory required'
          }
          complete={checklist.boeConfirmed}
        />

        <ChecklistItem
          icon={<Shield className="h-4 w-4" />}
          title="Conflicts of Interest Cleared"
          description={
            checklist.coiCleared
              ? 'No active COI disclosures for assigned team'
              : 'Resolve or clear COI disclosures before proceeding'
          }
          complete={checklist.coiCleared}
        />

        <ChecklistItem
          icon={<Users className="h-4 w-4" />}
          title="Assessment Team Composed"
          description={
            checklist.teamComposed
              ? 'Lead + team assigned'
              : 'Assign a lead assessor and at least one team member'
          }
          complete={checklist.teamComposed}
        />

        <ChecklistItem
          icon={<FileText className="h-4 w-4" />}
          title="Pre-Assessment Form Drafted"
          description={
            checklist.preAssessFormDrafted
              ? 'Form drafted and awaiting QA review'
              : 'Draft the pre-assessment form before QA review'
          }
          complete={checklist.preAssessFormDrafted}
          action={
            canEdit ? (
              <Button
                type="button"
                size="sm"
                variant={checklist.preAssessFormDrafted ? 'outline' : 'default'}
                disabled={isPending}
                onClick={() =>
                  applyUpdate({
                    preAssessFormDrafted: !checklist.preAssessFormDrafted,
                  })
                }
              >
                {checklist.preAssessFormDrafted ? 'Mark Undrafted' : 'Mark Drafted'}
              </Button>
            ) : undefined
          }
        />

        <ChecklistItem
          icon={<FileCheck className="h-4 w-4" />}
          title="Pre-Assessment Form QA'd"
          description={
            checklist.preAssessFormQaStatus === 'APPROVED'
              ? 'Approved by independent QA reviewer'
              : checklist.preAssessFormQaStatus
                ? `Status: ${checklist.preAssessFormQaStatus}`
                : 'QA review pending'
          }
          complete={checklist.preAssessFormQaStatus === 'APPROVED'}
          action={
            canEdit ? (
              <Select
                value={checklist.preAssessFormQaStatus ?? 'NONE'}
                onValueChange={(v) =>
                  applyUpdate({
                    preAssessFormQaStatus: v === 'NONE' ? null : v,
                  })
                }
                disabled={isPending}
              >
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not set</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                </SelectContent>
              </Select>
            ) : undefined
          }
        />

        <ChecklistItem
          icon={<UploadCloud className="h-4 w-4" />}
          title="Uploaded to eMASS"
          description={
            checklist.preAssessFormUploadedAt
              ? `Uploaded ${format(
                  safeDate(checklist.preAssessFormUploadedAt) ?? new Date(),
                  'PPP',
                )}`
              : 'Upload the approved pre-assessment form to CMMC eMASS'
          }
          complete={checklist.preAssessFormUploadedAt !== null}
          action={
            canEdit ? (
              <Button
                type="button"
                size="sm"
                variant={
                  checklist.preAssessFormUploadedAt ? 'outline' : 'default'
                }
                disabled={isPending}
                onClick={() =>
                  applyUpdate({
                    preAssessFormUploadedAt: checklist.preAssessFormUploadedAt
                      ? null
                      : new Date().toISOString(),
                  })
                }
              >
                {checklist.preAssessFormUploadedAt ? 'Clear' : 'Mark Uploaded'}
              </Button>
            ) : undefined
          }
        />
      </div>

      {!canEdit && (
        <p className="text-center text-xs text-muted-foreground">
          Only lead assessors can update the pre-assessment checklist.
        </p>
      )}
    </div>
  )
}
