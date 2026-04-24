'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  StopCircle,
  FileSignature,
  Download,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  updateEngagementStatus,
  recordAssessmentResult,
  startAssessment,
  stopAssessment,
  submitAssessmentForApproval,
  rejectAssessmentSubmission,
} from '@/app/actions/c3pao-dashboard'
import { resumeReEvaluationAction } from '@/app/actions/engagements'
import {
  CMMCStatusConfig,
  calculateExpirationDate,
  type CMMCStatus,
} from '@/lib/cmmc/status-determination'
import { derivePhaseFromStatus, type Phase } from '@/lib/portfolio/derive-risk'
import { toast } from 'sonner'

/** Status values understood by the assessor action bar. Includes correction-cycle states. */
type EngagementStatus =
  | 'REQUESTED'
  | 'INTRODUCED'
  | 'ACKNOWLEDGED'
  | 'PROPOSAL_SENT'
  | 'PROPOSAL_ACCEPTED'
  | 'PROPOSAL_DECLINED'
  | 'ACCEPTED'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'AWAITING_OSC_CORRECTIONS'
  | 'COMPLETED'
  | 'CANCELLED'
  | string

interface EngagementActionsEngagement {
  id: string
  status: EngagementStatus
  assessmentType?: string
  assessmentModeActive?: boolean
  assessmentResult?: string | null
  leadAssessor?: { id: string } | null
  atoPackage?: {
    name?: string
    organization?: { name?: string } | null
  } | null
}

interface EngagementActionsUser {
  id: string
  isLeadAssessor: boolean
}

interface EngagementActionsTeamMember {
  assessorId: string
  role: string
}

interface ControlStats {
  total: number
  compliant: number
  nonCompliant: number
  inProgress: number
  notStarted: number
  notApplicable: number
}

interface AutoDetectedStatus {
  suggestedStatus: CMMCStatus
  confidence: 'high' | 'medium'
  reasoning: string
}

interface EngagementActionsProps {
  engagement: EngagementActionsEngagement
  user: EngagementActionsUser
  team: EngagementActionsTeamMember[]
  /** Resolved phase from the parent (Task 8 column). When null, derive from status. */
  currentPhase: string | null
  /** Auto-detected CMMC status from control results — optional; gates Complete dialog. */
  autoDetectedStatus: AutoDetectedStatus | null
  /** Memoized control stats for the Complete dialog summary + zero-assessed guard. */
  controlStats: ControlStats
}

/**
 * Phase-driven action bar for an active engagement. Buttons are organized by
 * CAP v2.0 phase (PRE_ASSESS / ASSESS / REPORT / CLOSE_OUT) instead of flat
 * status checks — this matches the lifecycle stepper and keeps the UI in sync
 * with the backend's phase column when present.
 */
export function EngagementActions({
  engagement,
  user,
  team,
  currentPhase,
  autoDetectedStatus,
  controlStats,
}: EngagementActionsProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showStartAssessmentDialog, setShowStartAssessmentDialog] = useState(false)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showStopDialog, setShowStopDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<CMMCStatus | null>(null)
  const [findings, setFindings] = useState('')
  const [submissionNotes, setSubmissionNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  // Seed selectedStatus from auto-detection when the dialog opens.
  const handleOpenResultDialog = (open: boolean) => {
    setShowResultDialog(open)
    if (open && autoDetectedStatus && !selectedStatus) {
      setSelectedStatus(autoDetectedStatus.suggestedStatus)
    }
  }

  const resolvedPhase: Phase | null =
    (currentPhase as Phase | null) ??
    derivePhaseFromStatus(engagement.status, engagement.assessmentResult ?? null)

  const isLead = user.isLeadAssessor
  const isUserAssigned = team.some(
    (t) => t.assessorId === user.id && (t.role === 'LEAD' || t.role === 'ASSESSOR'),
  )
  const isMock = engagement.assessmentType === 'MOCK'
  const assessmentModeActive = Boolean(engagement.assessmentModeActive)

  // Per-engagement lead — distinct from the user's org-wide isLeadAssessor flag.
  const isCurrentUserEngagementLead = Boolean(
    engagement.leadAssessor?.id && engagement.leadAssessor.id === user.id,
  )

  const isAllNotAssessed =
    controlStats.compliant === 0 &&
    controlStats.nonCompliant === 0 &&
    controlStats.notApplicable === 0

  const orgName = engagement.atoPackage?.organization?.name ?? 'this organization'

  // ---- Handlers ----

  const handleStartAssessment = async () => {
    setIsUpdating(true)
    try {
      const result = await startAssessment(engagement.id)
      if (result.success) {
        toast.success(result.message || 'Assessment started - Customer package is now read-only')
        setShowStartAssessmentDialog(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to start assessment')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAcceptRequest = async () => {
    setIsUpdating(true)
    try {
      const result = await updateEngagementStatus(engagement.id, 'ACCEPTED')
      if (result.success) {
        toast.success('Status updated successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update status')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleStopAssessment = async () => {
    setIsUpdating(true)
    try {
      const result = await stopAssessment(engagement.id)
      if (result.success) {
        toast.success('Assessment mode deactivated')
        setShowStopDialog(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to stop assessment')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCompleteAssessment = async () => {
    if (!selectedStatus) {
      toast.error('Please select a status')
      return
    }
    setIsUpdating(true)
    try {
      const result = await recordAssessmentResult(
        engagement.id,
        selectedStatus,
        findings || undefined,
      )
      if (result.success) {
        toast.success('Assessment completed')
        setShowResultDialog(false)
        setFindings('')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to record assessment result')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSubmitForApproval = async () => {
    setIsUpdating(true)
    try {
      const result = await submitAssessmentForApproval(
        engagement.id,
        submissionNotes || undefined,
      )
      if (result.success) {
        toast.success('Assessment submitted for lead assessor approval')
        setShowSubmitDialog(false)
        setSubmissionNotes('')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to submit for approval')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRejectSubmission = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for sending back')
      return
    }
    setIsUpdating(true)
    try {
      const result = await rejectAssessmentSubmission(engagement.id, rejectionReason)
      if (result.success) {
        toast.success('Assessment sent back for more work')
        setShowRejectDialog(false)
        setRejectionReason('')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to send back')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelEngagement = async () => {
    setIsUpdating(true)
    try {
      const result = await updateEngagementStatus(
        engagement.id,
        'CANCELLED',
        cancelReason || undefined,
      )
      if (result.success) {
        toast.success('Engagement cancelled')
        setShowCancelDialog(false)
        setCancelReason('')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to cancel engagement')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleResumeReEvaluation = async () => {
    setIsUpdating(true)
    try {
      const result = await resumeReEvaluationAction(engagement.id)
      if (result.success) {
        toast.success('Re-evaluation resumed with the latest OSC state.')
        setShowResumeDialog(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to resume re-evaluation')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  // ---- Buttons (small render helpers, not new components) ----

  const acceptRequestButton = (
    <Button onClick={handleAcceptRequest} disabled={isUpdating}>
      Accept Request
    </Button>
  )

  const startAssessmentButton = (
    <Dialog open={showStartAssessmentDialog} onOpenChange={setShowStartAssessmentDialog}>
      <DialogTrigger asChild>
        <Button>
          <Shield className="h-4 w-4 mr-2" />
          Start Assessment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start CMMC Assessment</DialogTitle>
          <DialogDescription>This will begin the formal assessment process</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Customer Package Will Be Locked
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Once you start the assessment, <strong>{orgName}</strong>&apos;s package will be
                  set to read-only mode. They will not be able to upload documents, modify assets,
                  or make any changes until the assessment is complete.
                </p>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            You can pause the lock temporarily if the customer needs to provide additional
            documentation during the assessment.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowStartAssessmentDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleStartAssessment} disabled={isUpdating}>
            {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Start Assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const stopAssessmentButton = (
    <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-amber-600 border-amber-300 hover:bg-amber-50">
          <StopCircle className="h-4 w-4 mr-2" />
          Stop Assessment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stop Assessment</DialogTitle>
          <DialogDescription>
            This will deactivate assessment mode and unlock the customer&apos;s package. The
            assessment will remain in progress and can be resumed later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowStopDialog(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleStopAssessment} disabled={isUpdating}>
            {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Stop Assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const completeAssessmentButton = (
    <Dialog open={showResultDialog} onOpenChange={handleOpenResultDialog}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Complete Assessment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Complete Assessment</DialogTitle>
          <DialogDescription>
            Review the auto-detected CMMC status and confirm the final outcome. The lead assessor
            retains full override authority per CAP v2.0.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isAllNotAssessed && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-100">
                    No Objectives Assessed
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    All controls are still marked as Not Assessed. Complete the control assessment
                    before finalizing the outcome.
                  </p>
                </div>
              </div>
            </div>
          )}

          {autoDetectedStatus && selectedStatus && (
            <div
              className={`rounded-lg border p-4 ${CMMCStatusConfig[selectedStatus].bgClass} ${CMMCStatusConfig[selectedStatus].borderClass}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-semibold ${CMMCStatusConfig[selectedStatus].textClass}`}
                    >
                      {CMMCStatusConfig[selectedStatus].label}
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full cursor-help ${
                              autoDetectedStatus.confidence === 'high'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                            }`}
                          >
                            <Info className="h-3 w-3" />
                            {autoDetectedStatus.confidence === 'high'
                              ? 'High confidence'
                              : 'Verify with lead'}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{autoDetectedStatus.reasoning}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className={`text-sm ${CMMCStatusConfig[selectedStatus].textClass}`}>
                    {CMMCStatusConfig[selectedStatus].description}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600">{controlStats.compliant}</div>
              <div className="text-xs text-muted-foreground mt-1">Met</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-2xl font-bold text-red-600">{controlStats.nonCompliant}</div>
              <div className="text-xs text-muted-foreground mt-1">Not Met</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-muted-foreground">
                {controlStats.inProgress + controlStats.notStarted}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Not Assessed</div>
            </div>
          </div>

          {selectedStatus && selectedStatus !== 'NO_CMMC_STATUS' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>
                {selectedStatus === 'FINAL_LEVEL_2'
                  ? `Certificate valid for 3 years — expires ${format(
                      calculateExpirationDate('FINAL_LEVEL_2', new Date())!,
                      'PPP',
                    )}`
                  : `Conditional certificate expires in 180 days — ${format(
                      calculateExpirationDate('CONDITIONAL_LEVEL_2', new Date())!,
                      'PPP',
                    )}`}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Final Status (Lead Assessor Override)</label>
            <p className="text-xs text-muted-foreground">
              Auto-detected from control results and POA&Ms. Override only when regulatory criteria
              require it.
            </p>
            <Select
              value={selectedStatus || ''}
              onValueChange={(v) => setSelectedStatus(v as CMMCStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FINAL_LEVEL_2">
                  Final Level 2 — All requirements met (3-year certificate)
                </SelectItem>
                <SelectItem value="CONDITIONAL_LEVEL_2">
                  Conditional Level 2 — Valid POA&M exists (180-day certificate)
                </SelectItem>
                <SelectItem value="NO_CMMC_STATUS">
                  No CMMC Status — Requirements not met
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isMock && (
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>CAP Section 3.15:</strong> Do not include remediation advice, mitigation
                guidance, or corrective action recommendations in result notes for certification
                assessments.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Result Notes (Optional)</label>
            <Textarea
              placeholder="Enter any notes about the assessment result..."
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowResultDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCompleteAssessment}
            disabled={isUpdating || isAllNotAssessed || !selectedStatus}
            className={
              !selectedStatus
                ? ''
                : selectedStatus === 'FINAL_LEVEL_2'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : selectedStatus === 'CONDITIONAL_LEVEL_2'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
            }
          >
            {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {selectedStatus
              ? `Confirm — ${CMMCStatusConfig[selectedStatus].label}`
              : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const submitForApprovalButton = (
    <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
      <DialogTrigger asChild>
        <Button>Submit for Approval</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Assessment for Approval</DialogTitle>
          <DialogDescription>
            Submit this assessment to the lead assessor for final review and approval
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              placeholder="Add any notes for the lead assessor..."
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmitForApproval} disabled={isUpdating}>
            {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit for Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const sendBackButton = (
    <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
      <DialogTrigger asChild>
        <Button variant="outline">Send Back</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Back for More Work</DialogTitle>
          <DialogDescription>
            Return this assessment to the team for additional work
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for Sending Back</label>
            <Textarea
              placeholder="Explain what needs to be addressed..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRejectSubmission} disabled={isUpdating}>
            {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const writeReportButton = (
    <Link href={`/engagements/${engagement.id}/report`}>
      <Button variant="outline">
        <FileSignature className="h-4 w-4 mr-2" />
        Write Report
      </Button>
    </Link>
  )

  const exportToEmassButton = (
    <Link href={`/engagements/${engagement.id}/emass-export`}>
      <Button variant="outline">
        <Download className="h-4 w-4 mr-2" />
        Export to eMASS
      </Button>
    </Link>
  )

  const cancelButton = (
    <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950/30"
        >
          <XCircle className="h-4 w-4 mr-2" />
          {engagement.status === 'REQUESTED'
            ? 'Decline Request'
            : ['IN_PROGRESS', 'PENDING_APPROVAL'].includes(engagement.status)
              ? 'Cancel Assessment'
              : 'Cancel Engagement'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {engagement.status === 'REQUESTED'
              ? 'Decline Request'
              : ['IN_PROGRESS', 'PENDING_APPROVAL'].includes(engagement.status)
                ? 'Cancel Assessment'
                : 'Cancel Engagement'}
          </DialogTitle>
          <DialogDescription>
            {engagement.status === 'REQUESTED'
              ? `Decline the assessment request from ${orgName}. This cannot be undone.`
              : ['IN_PROGRESS', 'PENDING_APPROVAL'].includes(engagement.status)
                ? `Cancel the active assessment for ${orgName}. All assessment data for this engagement will be removed. This cannot be undone.`
                : `Cancel this engagement with ${orgName}. This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (Optional)</label>
            <Textarea
              placeholder="Let the customer know why..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
            Keep Engagement
          </Button>
          <Button variant="destructive" onClick={handleCancelEngagement} disabled={isUpdating}>
            {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {engagement.status === 'REQUESTED'
              ? 'Decline Request'
              : ['IN_PROGRESS', 'PENDING_APPROVAL'].includes(engagement.status)
                ? 'Cancel Assessment'
                : 'Cancel Engagement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const resumeReevaluationButton = (
    <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
      <DialogTrigger asChild>
        <Button aria-label="Resume Re-Evaluation">Resume Re-Evaluation</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resume Re-Evaluation?</DialogTitle>
          <DialogDescription>
            The OSC package will be locked to assessors and you can continue scoring. The
            engagement data will refresh with the latest OSC updates when you continue.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setShowResumeDialog(false)}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button onClick={handleResumeReEvaluation} disabled={isUpdating}>
            {isUpdating ? 'Working…' : 'Resume'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  // ---- Phase-driven layout ----

  return (
    <div className="flex items-center gap-2">
      {resolvedPhase === 'PRE_ASSESS' && (
        <>
          {engagement.status === 'REQUESTED' && acceptRequestButton}
          {(engagement.status === 'ACCEPTED' || engagement.status === 'PROPOSAL_ACCEPTED') &&
            startAssessmentButton}
          {cancelButton}
        </>
      )}

      {resolvedPhase === 'ASSESS' && (
        <>
          {engagement.status === 'AWAITING_OSC_CORRECTIONS' && isCurrentUserEngagementLead &&
            resumeReevaluationButton}
          {engagement.status !== 'AWAITING_OSC_CORRECTIONS' && (
            <>
              {assessmentModeActive && isLead && stopAssessmentButton}
              {isUserAssigned && !isLead && submitForApprovalButton}
              {isLead && completeAssessmentButton}
              {isMock && isLead && writeReportButton}
            </>
          )}
          {cancelButton}
        </>
      )}

      {resolvedPhase === 'REPORT' && (
        <>
          {engagement.status === 'PENDING_APPROVAL' && isLead && completeAssessmentButton}
          {engagement.status === 'PENDING_APPROVAL' && isLead && sendBackButton}
          {isMock && engagement.status === 'PENDING_APPROVAL' && isLead && writeReportButton}
          {engagement.status === 'COMPLETED' && exportToEmassButton}
          {engagement.status !== 'COMPLETED' && cancelButton}
        </>
      )}

      {resolvedPhase === 'CLOSE_OUT' && exportToEmassButton}
    </div>
  )
}
