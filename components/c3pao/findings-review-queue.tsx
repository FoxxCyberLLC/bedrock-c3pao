'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Filter,
  MessageSquare,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  getAssessmentFindings,
  reviewAssessmentFinding,
} from '@/app/actions/c3pao-assessment'

// ---------- Types ----------

interface FindingView {
  id: string
  engagementId: string
  requirementId: string
  requirementCode: string
  determination: string
  methodInterview: boolean
  methodExamine: boolean
  methodTest: boolean
  finding: string | null
  objectiveEvidence: string | null
  deficiency: string | null
  recommendation: string | null
  riskLevel: string | null
  evidenceReviewed: string | null
  assessedById: string | null
  assessedAt: string | null
  version: number
  editingById: string | null
  editingByName: string | null
  editingAt: string | null
  reviewStatus: string | null
  reviewedById: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  createdAt: string
  updatedAt: string
}

type ReviewAction = 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED'

interface FindingsReviewQueueProps {
  engagementId: string
  isLeadAssessor: boolean
}

// ---------- Constants ----------

const reviewStatusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
  APPROVED: { label: 'Approved', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' },
  NEEDS_REVISION: { label: 'Needs Revision', className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20' },
  REJECTED: { label: 'Rejected', className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' },
}

const determinationConfig: Record<string, { label: string; className: string }> = {
  MET: { label: 'Met', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' },
  NOT_MET: { label: 'Not Met', className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' },
  NOT_APPLICABLE: { label: 'N/A', className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20' },
  NOT_ASSESSED: { label: 'Not Assessed', className: 'bg-gray-500/10 text-gray-500 dark:text-gray-500 border-gray-500/20' },
}

const riskLevelConfig: Record<string, { label: string; className: string }> = {
  CRITICAL: { label: 'Critical', className: 'bg-red-500/20 text-red-700 dark:text-red-400' },
  HIGH: { label: 'High', className: 'bg-orange-500/20 text-orange-700 dark:text-orange-400' },
  MODERATE: { label: 'Moderate', className: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  LOW: { label: 'Low', className: 'bg-blue-500/20 text-blue-700 dark:text-blue-400' },
}

const reviewActionConfig: Record<ReviewAction, { label: string; description: string; variant: 'default' | 'destructive' | 'outline' }> = {
  APPROVED: { label: 'Approve', description: 'Approve this finding. It will be marked as reviewed and included in the final report.', variant: 'default' },
  NEEDS_REVISION: { label: 'Needs Revision', description: 'Send this finding back to the assessor for revision. Add notes explaining what needs to change.', variant: 'outline' },
  REJECTED: { label: 'Reject', description: 'Reject this finding. It will need to be completely redone.', variant: 'destructive' },
}

// ---------- Helper ----------

function getEffectiveReviewStatus(finding: FindingView): string {
  if (finding.reviewStatus) return finding.reviewStatus
  // Findings with a determination and no review status are pending
  if (finding.determination && finding.determination !== 'NOT_ASSESSED') return 'PENDING'
  return 'PENDING'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--'
  try {
    return format(new Date(dateStr), 'PPP')
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '--'
  try {
    return format(new Date(dateStr), 'PPp')
  } catch {
    return dateStr
  }
}

// ---------- Sub-components ----------

function ReviewStatusBadge({ status }: { status: string }) {
  const config = reviewStatusConfig[status]
  if (!config) return <Badge variant="outline">{status}</Badge>
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>
}

function DeterminationBadge({ determination }: { determination: string }) {
  const config = determinationConfig[determination]
  if (!config) return <Badge variant="outline">{determination}</Badge>
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>
}

function MethodBadges({ finding }: { finding: FindingView }) {
  return (
    <div className="flex gap-1.5">
      {finding.methodInterview && (
        <span className="inline-flex items-center rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400">
          Interview
        </span>
      )}
      {finding.methodExamine && (
        <span className="inline-flex items-center rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:text-purple-400">
          Examine
        </span>
      )}
      {finding.methodTest && (
        <span className="inline-flex items-center rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 dark:text-teal-400">
          Test
        </span>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ---------- Review Dialog ----------

function ReviewDialog({
  finding,
  action,
  onConfirm,
  isSubmitting,
}: {
  finding: FindingView
  action: ReviewAction
  onConfirm: (notes: string) => void
  isSubmitting: boolean
}) {
  const [notes, setNotes] = useState('')
  const [open, setOpen] = useState(false)
  const config = reviewActionConfig[action]

  const handleConfirm = () => {
    onConfirm(notes)
    setNotes('')
    setOpen(false)
  }

  const actionIcon =
    action === 'APPROVED' ? <CheckCircle2 className="h-4 w-4" /> :
    action === 'NEEDS_REVISION' ? <AlertTriangle className="h-4 w-4" /> :
    <XCircle className="h-4 w-4" />

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={config.variant}
          size="sm"
          disabled={isSubmitting}
          className="gap-1.5"
        >
          {actionIcon}
          {config.label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {actionIcon}
            {config.label} Finding - {finding.requirementCode}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-md border p-3 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <DeterminationBadge determination={finding.determination} />
              <MethodBadges finding={finding} />
            </div>
            {finding.finding && (
              <p className="text-muted-foreground line-clamp-3">{finding.finding}</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="review-notes" className="text-sm font-medium">
              Review Notes {action !== 'APPROVED' && <span className="text-muted-foreground">(recommended)</span>}
            </label>
            <Textarea
              id="review-notes"
              placeholder={
                action === 'APPROVED'
                  ? 'Optional notes for the assessor...'
                  : 'Explain what needs to be changed...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant={config.variant}
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              actionIcon
            )}
            Confirm {config.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Finding Card ----------

function FindingCard({
  finding,
  isLeadAssessor,
  onReview,
  isSubmitting,
}: {
  finding: FindingView
  isLeadAssessor: boolean
  onReview: (findingId: string, action: ReviewAction, notes: string) => void
  isSubmitting: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const effectiveStatus = getEffectiveReviewStatus(finding)
  const canReview = effectiveStatus === 'PENDING' || effectiveStatus === 'NEEDS_REVISION'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold">{finding.requirementCode}</span>
          <DeterminationBadge determination={finding.determination} />
          <ReviewStatusBadge status={effectiveStatus} />
          {finding.riskLevel && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${riskLevelConfig[finding.riskLevel]?.className || ''}`}>
              {riskLevelConfig[finding.riskLevel]?.label || finding.riskLevel}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Finding text */}
        {finding.finding && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Finding</p>
            <p className={`text-sm ${expanded ? '' : 'line-clamp-3'}`}>{finding.finding}</p>
            {finding.finding.length > 200 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-primary hover:underline"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <>
            {finding.objectiveEvidence && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Objective Evidence</p>
                <p className="text-sm">{finding.objectiveEvidence}</p>
              </div>
            )}
            {finding.deficiency && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Deficiency</p>
                <p className="text-sm">{finding.deficiency}</p>
              </div>
            )}
            {finding.recommendation && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Recommendation</p>
                <p className="text-sm">{finding.recommendation}</p>
              </div>
            )}
            {finding.evidenceReviewed && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Evidence Reviewed</p>
                <p className="text-sm">{finding.evidenceReviewed}</p>
              </div>
            )}
          </>
        )}

        {/* Assessment methods and metadata */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <MethodBadges finding={finding} />
          {finding.assessedAt && (
            <span>Assessed {formatDate(finding.assessedAt)}</span>
          )}
        </div>

        {/* Review info (visible to all when reviewed) */}
        {effectiveStatus !== 'PENDING' && finding.reviewedByName && (
          <div className="rounded-md border border-dashed p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">Review by {finding.reviewedByName}</span>
              <ReviewStatusBadge status={effectiveStatus} />
              {finding.reviewedAt && (
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(finding.reviewedAt)}
                </span>
              )}
            </div>
            {finding.reviewNotes && (
              <p className="text-sm text-muted-foreground pl-5">{finding.reviewNotes}</p>
            )}
          </div>
        )}

        {/* Review actions (Lead Assessors only) */}
        {isLeadAssessor && canReview && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <ReviewDialog
              finding={finding}
              action="APPROVED"
              onConfirm={(notes) => onReview(finding.id, 'APPROVED', notes)}
              isSubmitting={isSubmitting}
            />
            <ReviewDialog
              finding={finding}
              action="NEEDS_REVISION"
              onConfirm={(notes) => onReview(finding.id, 'NEEDS_REVISION', notes)}
              isSubmitting={isSubmitting}
            />
            <ReviewDialog
              finding={finding}
              action="REJECTED"
              onConfirm={(notes) => onReview(finding.id, 'REJECTED', notes)}
              isSubmitting={isSubmitting}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------- Main Component ----------

export function FindingsReviewQueue({ engagementId, isLeadAssessor }: FindingsReviewQueueProps) {
  const [findings, setFindings] = useState<FindingView[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>(isLeadAssessor ? 'PENDING' : 'ALL')
  const [determinationFilter, setDeterminationFilter] = useState<string>('ALL')

  const fetchFindings = useCallback(async () => {
    try {
      const result = await getAssessmentFindings(engagementId)
      if (result.success && result.data) {
        // Only include findings that have been assessed (have a determination other than NOT_ASSESSED)
        setFindings(result.data.filter((f) => f.determination && f.determination !== 'NOT_ASSESSED'))
      } else {
        toast.error('Failed to load findings')
      }
    } catch {
      toast.error('Failed to load findings')
    }
  }, [engagementId])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await fetchFindings()
      setLoading(false)
    }
    load()
  }, [fetchFindings])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchFindings()
    setRefreshing(false)
    toast.success('Findings refreshed')
  }

  const handleReview = async (findingId: string, action: ReviewAction, notes: string) => {
    setSubmitting(true)
    try {
      const result = await reviewAssessmentFinding(engagementId, findingId, action, notes || undefined)
      if (result.success && result.data) {
        const updatedFinding = result.data
        setFindings((prev) =>
          prev.map((f) => (f.id === findingId ? updatedFinding : f))
        )
        const actionLabel = reviewActionConfig[action].label.toLowerCase()
        toast.success(`Finding ${updatedFinding.requirementCode} ${actionLabel}`)
      } else {
        toast.error(result.error || 'Failed to review finding')
      }
    } catch {
      toast.error('Failed to review finding')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------- Computed ----------

  const statusCounts = findings.reduce<Record<string, number>>((acc, f) => {
    const status = getEffectiveReviewStatus(f)
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const filteredFindings = findings.filter((f) => {
    const effectiveStatus = getEffectiveReviewStatus(f)
    if (statusFilter !== 'ALL' && effectiveStatus !== statusFilter) return false
    if (determinationFilter !== 'ALL' && f.determination !== determinationFilter) return false
    return true
  })

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CheckSquare className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Findings Review</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={reviewStatusConfig.PENDING.className}>
            {statusCounts.PENDING || 0} Pending
          </Badge>
          <Badge variant="outline" className={reviewStatusConfig.APPROVED.className}>
            {statusCounts.APPROVED || 0} Approved
          </Badge>
          <Badge variant="outline" className={reviewStatusConfig.NEEDS_REVISION.className}>
            {statusCounts.NEEDS_REVISION || 0} Needs Revision
          </Badge>
          <Badge variant="outline" className={reviewStatusConfig.REJECTED.className}>
            {statusCounts.REJECTED || 0} Rejected
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5 ml-1">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue placeholder="Review Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="NEEDS_REVISION">Needs Revision</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={determinationFilter} onValueChange={setDeterminationFilter}>
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue placeholder="Determination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Determinations</SelectItem>
                <SelectItem value="MET">Met</SelectItem>
                <SelectItem value="NOT_MET">Not Met</SelectItem>
                <SelectItem value="NOT_APPLICABLE">Not Applicable</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredFindings.length} of {findings.length} findings
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Findings List */}
      {filteredFindings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <CardTitle className="text-base mb-1">No findings to review</CardTitle>
            <CardDescription>
              {findings.length === 0
                ? 'No assessed findings have been submitted yet. Findings will appear here once assessors submit their determinations.'
                : 'No findings match the current filters. Try adjusting your filter criteria.'}
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              isLeadAssessor={isLeadAssessor}
              onReview={handleReview}
              isSubmitting={submitting}
            />
          ))}
        </div>
      )}
    </div>
  )
}
