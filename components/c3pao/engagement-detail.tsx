'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { safeDate } from '@/lib/utils'
import {
  ArrowLeft,
  Building2,
  Shield,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  MessageSquare,
  Loader2,
  Calendar,
  User,
  Users,
  Clock,
  FileSignature,
  Download,
  FileJson,
  StopCircle,
  Ban,
  ClipboardList,
  BarChart3,
  CheckSquare,
  Lock,
  Info,
  Copy,
  FileDown,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { updateEngagementStatus, addAssessorNotes, recordAssessmentResult, startAssessment, endAssessmentMode, stopAssessment, submitAssessmentForApproval, rejectAssessmentSubmission } from '@/app/actions/c3pao-dashboard'
import { determineCMMCStatus, calculateExpirationDate, CMMCStatusConfig, normalizeLegacyStatus, type CMMCStatus } from '@/lib/cmmc/status-determination'
import { toast } from 'sonner'
import { AssessmentControlsTable } from './assessment-controls-table'
import { POAMViewer } from './poam-viewer'
import { EvidenceViewer } from './evidence-viewer'
import { DocumentsViewer } from './documents-viewer'
import { AssessmentModeIndicator } from './assessment-mode-indicator'
import { EngagementTeamCard } from './engagement-team-card'
import { ConflictDialog } from './conflict-dialog'
import { STIGViewer } from './stig-viewer'
import { AssessmentPlanningBoard } from './assessment-planning-board'
import { AssessmentProgressTracker } from './assessment-progress-tracker'
import { FindingsReviewQueue } from './findings-review-queue'
import { CheckinCard } from './checkin-card'
import { getEngagementTeam } from '@/app/actions/c3pao-team-assignment'

type EngagementAssessorRole = 'LEAD_ASSESSOR' | 'ASSESSOR' | 'OBSERVER' | string
// Prisma types replaced - data comes from SaaS API as JSON

interface Evidence {
  id: string
  fileName: string
  mimeType: string | null
  fileSize: number | null
  description: string | null
  createdAt: Date
}

interface RequirementFamily {
  id: string
  code: string
  name: string
}

interface Requirement {
  id: string
  requirementId: string
  title: string
  basicRequirement: string
  derivedRequirement: string | null
  discussion: string
  family: RequirementFamily
}

interface RequirementStatus {
  id: string
  status: string
  implementationNotes: string | null
  assessmentNotes: string | null
  requirement: Requirement
  evidence: Evidence[]
}

interface POAMRequirement {
  id: string
  requirement: {
    requirementId: string
    title: string
  }
}

interface POAMMilestone {
  id: string
  description: string
  dueDate: Date
  completed: boolean
  completedDate: Date | null
  sortOrder: number
}

interface POAM {
  id: string
  title: string
  description: string
  status: string
  riskLevel: string
  type: string
  remediationPlan: string
  scheduledCompletionDate: Date
  actualCompletionDate: Date | null
  deadline: Date
  daysToRemediate: number
  createdAt: Date
  requirements: POAMRequirement[]
  milestones: POAMMilestone[]
}

interface SSP {
  id: string
  version: string
  status: string
  approvedBy: string | null
  approvedAt: Date | null
  expirationDate: Date | null
  systemName: string | null
  systemAbbreviation: string | null
  systemCategory: string | null
  systemPurpose: string | null
  systemDescription: string | null
  systemArchitecture: string | null
  systemBoundary: string | null
  systemEnvironment: string | null
  networkDiagram: string | null
  dataFlow: string | null
  interconnections: string | null
  systemOwner: string | null
  securityOfficer: string | null
  authorizingOfficial: string | null
  securityPolicies: string | null
  incidentResponse: string | null
  contingencyPlan: string | null
  configurationMgmt: string | null
  maintenanceProcedures: string | null
  trainingProgram: string | null
  generatedAt: Date | null
  pdfUrl: string | null
  lastModified: Date
  createdAt: Date
}

interface Asset {
  id: string
  name: string
  assetType: string
  assetCategory: string
  description: string | null
  ipAddress: string | null
  macAddress: string | null
  hostname: string | null
  location: string | null
  owner: string | null
  processesCUI: boolean
  processesFCI: boolean
}

interface ExternalServiceProvider {
  id: string
  providerName: string
  providerType: string
  services: string | null
  status: string
  contractEndDate: Date | null
  cmmcLevel: string | null
  cmmcCertified: boolean
  fedRampCertified: boolean
  fedRampLevel: string | null
}

/** Maps OSC package requirement status to CMMC objective status for auto-detection. */
function mapRequirementStatus(status: string): 'MET' | 'NOT_MET' | 'NOT_APPLICABLE' | 'NOT_ASSESSED' {
  switch (status) {
    case 'COMPLIANT': return 'MET'
    case 'NON_COMPLIANT': return 'NOT_MET'
    case 'NOT_APPLICABLE': return 'NOT_APPLICABLE'
    default: return 'NOT_ASSESSED'
  }
}

interface EngagementDetailProps {
  engagement: {
    id: string
    status: string
    assessmentType?: string
    targetLevel: string
    customerNotes: string | null
    assessmentNotes: string | null
    assessmentResult: string | null
    resultNotes: string | null
    createdAt: Date
    updatedAt: Date
    acceptedDate: Date | null
    actualStartDate: Date | null
    actualCompletionDate: Date | null
    assessmentModeActive: boolean
    assessmentModeStartedAt: Date | null
    atoPackage: {
      id: string
      name: string
      cmmcLevel: string
      description: string | null
      organization: {
        id: string
        name: string
      } | null
      requirementStatuses: RequirementStatus[]
      poams: POAM[]
      evidence: Evidence[]
      ssp: SSP | null
      assets: Asset[]
      externalServiceProviders: ExternalServiceProvider[]
    } | null
    leadAssessor: {
      id: string
      name: string
      email: string
    } | null
  }
  user: {
    id: string
    name: string
    email: string
    isLeadAssessor: boolean
  }
}

export function EngagementDetail({ engagement, user }: EngagementDetailProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [notes, setNotes] = useState(engagement.assessmentNotes || '')
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [showStartAssessmentDialog, setShowStartAssessmentDialog] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<CMMCStatus | null>(null)
  const [findings, setFindings] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showStopDialog, setShowStopDialog] = useState(false)
  const [submissionNotes, setSubmissionNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showNewAssessmentDialog, setShowNewAssessmentDialog] = useState(false)
  const [team, setTeam] = useState<{
    id: string
    assessorId: string
    name: string
    email: string
    role: EngagementAssessorRole
    assessorType: string
    jobTitle?: string | null
    assignedAt: string
    domains: string[]
  }[]>([])
  const [loadingTeam, setLoadingTeam] = useState(true)
  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean
    lastModifiedBy: string
  }>({ open: false, lastModifiedBy: '' })

  const pkg = engagement.atoPackage

  // Handle export to eMASS format
  const handleExportToEMASS = async () => {
    setIsExporting(true)
    try {
      // Trigger download via API route
      const response = await fetch(`/api/engagements/${engagement.id}/export`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `CMMC_Assessment_Export_${engagement.id}.xlsx`

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Assessment exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to export assessment')
    } finally {
      setIsExporting(false)
    }
  }

  // Load team assignments
  const loadTeam = async () => {
    setLoadingTeam(true)
    try {
      const result = await getEngagementTeam(engagement.id)
      if (result.success && result.data) {
        setTeam(result.data as any)
      }
    } catch (error) {
      console.error('Failed to load team:', error)
    } finally {
      setLoadingTeam(false)
    }
  }

  useEffect(() => {
    loadTeam()
  }, [engagement.id])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'INTRODUCED':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">Introduction Sent</Badge>
      case 'ACKNOWLEDGED':
        return <Badge variant="outline" className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20">Acknowledged</Badge>
      case 'PROPOSAL_SENT':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">Proposal Sent</Badge>
      case 'PROPOSAL_ACCEPTED':
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">Proposal Accepted</Badge>
      case 'PROPOSAL_DECLINED':
        return <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">Proposal Declined</Badge>
      case 'REQUESTED':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">New Request</Badge>
      case 'PENDING':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">Pending</Badge>
      case 'ACCEPTED':
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">Accepted</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">In Progress</Badge>
      case 'PENDING_APPROVAL':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20">Pending Approval</Badge>
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">Completed</Badge>
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      const result = await updateEngagementStatus(engagement.id, newStatus as 'ACCEPTED' | 'IN_PROGRESS' | 'PENDING' | 'REQUESTED' | 'COMPLETED' | 'CANCELLED')
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

  const handleSaveNotes = async () => {
    setIsUpdating(true)
    try {
      const result = await addAssessorNotes(engagement.id, notes)
      if (result.success) {
        toast.success('Notes saved')
      } else {
        toast.error(result.error || 'Failed to save notes')
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
      const result = await recordAssessmentResult(engagement.id, selectedStatus, findings || undefined)
      if (result.success) {
        // recordAssessmentResult already deactivates assessment mode defensively
        toast.success('Assessment completed')
        setShowResultDialog(false)
        setFindings('')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to complete assessment')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle submit for approval
  const handleSubmitForApproval = async () => {
    setIsUpdating(true)
    try {
      const result = await submitAssessmentForApproval(engagement.id, submissionNotes || undefined)
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

  // Handle reject submission
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

  // Handle cancel/decline engagement
  const handleCancelEngagement = async () => {
    setIsUpdating(true)
    try {
      const result = await updateEngagementStatus(engagement.id, 'CANCELLED', cancelReason || undefined)
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

  // Handle stop assessment (end assessment mode, keep IN_PROGRESS)
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

  // Build reference baseline markdown for clipboard export
  const buildBaselineMarkdown = () => {
    const orgName = pkg?.organization?.name || 'Unknown Organization'
    const pkgName = pkg?.name || 'Unknown Package'
    const completionDate = safeDate(engagement.actualCompletionDate)
    const cmmcStatus = normalizeLegacyStatus(engagement.assessmentResult)
    const expirationDate = cmmcStatus && completionDate ? calculateExpirationDate(cmmcStatus, completionDate) : null
    const statusLabel = cmmcStatus ? CMMCStatusConfig[cmmcStatus].label : (engagement.assessmentResult || 'Not recorded')

    return [
      `# CMMC Assessment Reference Baseline`,
      ``,
      `**Organization:** ${orgName}`,
      `**Package:** ${pkgName}`,
      `**Completed:** ${completionDate ? format(completionDate, 'PPP') : 'Unknown'}`,
      `**Result:** ${statusLabel}`,
      expirationDate ? `**Certificate Expires:** ${format(expirationDate, 'PPP')}` : null,
      ``,
      `## Control Summary`,
      ``,
      `| Status | Count |`,
      `|--------|-------|`,
      `| Met (Compliant) | ${controlStats.compliant} |`,
      `| Not Met (Non-Compliant) | ${controlStats.nonCompliant} |`,
      `| Not Assessed | ${controlStats.inProgress + controlStats.notStarted} |`,
      `| Not Applicable | ${controlStats.notApplicable} |`,
      `| **Total** | **${controlStats.total}** |`,
      ``,
      `**POA&Ms:** ${pkg?.poams.length || 0}`,
      engagement.resultNotes ? `\n## Result Notes\n\n${engagement.resultNotes}` : null,
      ``,
      `---`,
      `*Generated by Bedrock C3PAO on ${format(new Date(), 'PPP')}*`,
    ].filter(Boolean).join('\n')
  }

  // Build reference baseline JSON for file download
  const buildBaselineJSON = () => {
    const cmmcStatus = normalizeLegacyStatus(engagement.assessmentResult)
    const completionDate = safeDate(engagement.actualCompletionDate)
    const expirationDate = cmmcStatus && completionDate ? calculateExpirationDate(cmmcStatus, completionDate) : null
    return JSON.stringify({
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      assessment: {
        organizationName: pkg?.organization?.name || 'Unknown',
        packageName: pkg?.name || 'Unknown',
        completionDate: completionDate?.toISOString() || null,
        cmmcStatus: cmmcStatus || engagement.assessmentResult || null,
        cmmcStatusLabel: cmmcStatus ? CMMCStatusConfig[cmmcStatus].label : null,
        expirationDate: expirationDate?.toISOString() || null,
      },
      controlSummary: {
        total: controlStats.total,
        met: controlStats.compliant,
        notMet: controlStats.nonCompliant,
        notAssessed: controlStats.inProgress + controlStats.notStarted,
        notApplicable: controlStats.notApplicable,
      },
      poamCount: pkg?.poams.length || 0,
      resultNotes: engagement.resultNotes || null,
    }, null, 2)
  }

  const handleCopyBaseline = async () => {
    try {
      await navigator.clipboard.writeText(buildBaselineMarkdown())
      toast.success('Baseline summary copied to clipboard')
    } catch {
      toast.error('Failed to copy — try the Download option instead')
    }
  }

  const handleDownloadBaseline = () => {
    const orgSlug = (pkg?.organization?.name || 'unknown').replace(/\s+/g, '-').toLowerCase()
    const filename = `cmmc-baseline-${orgSlug}-${format(new Date(), 'yyyy-MM-dd')}.json`
    const blob = new Blob([buildBaselineJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Check if current user is assigned to this engagement
  const isUserAssigned = team.some(t => t.assessorId === user.id && (t.role === 'LEAD' || t.role === 'ASSESSOR'))

  // COMPLETED engagements are view-only — all mutating actions are suppressed.
  // The layout no longer redirects on COMPLETED, so this flag enforces read-only in the UI.
  const isReadOnly = engagement.status === 'COMPLETED'

  // Auto-detect CMMC status from control results and POA&M data.
  // Re-computed when the package data changes (e.g., after page refresh).
  const autoDetectedStatus = useMemo(() => {
    if (!pkg) return null
    const objectives = pkg.requirementStatuses.map(rs => ({
      requirementId: rs.requirement.requirementId,
      status: mapRequirementStatus(rs.status),
    }))
    const poamInputs = pkg.poams.map(p => ({
      id: p.id,
      scheduledCompletionDate: p.scheduledCompletionDate instanceof Date
        ? p.scheduledCompletionDate.toISOString()
        : String(p.scheduledCompletionDate || ''),
    }))
    return determineCMMCStatus(objectives, poamInputs)
  }, [pkg])

  // Seed selectedStatus from auto-detection when the dialog opens.
  useEffect(() => {
    if (showResultDialog && autoDetectedStatus) {
      setSelectedStatus(autoDetectedStatus.suggestedStatus)
    }
  }, [showResultDialog, autoDetectedStatus])

  // Calculate control stats (memoized to avoid 5× filter on every render)
  const controlStats = useMemo(() => ({
    total: pkg?.requirementStatuses.length || 0,
    compliant: pkg?.requirementStatuses.filter(c => c.status === 'COMPLIANT').length || 0,
    nonCompliant: pkg?.requirementStatuses.filter(c => c.status === 'NON_COMPLIANT').length || 0,
    inProgress: pkg?.requirementStatuses.filter(c => c.status === 'IN_PROGRESS').length || 0,
    notStarted: pkg?.requirementStatuses.filter(c => c.status === 'NOT_STARTED').length || 0,
    notApplicable: pkg?.requirementStatuses.filter(c => c.status === 'NOT_APPLICABLE').length || 0,
  }), [pkg])

  const assessedCount = controlStats.compliant + controlStats.nonCompliant + controlStats.notApplicable

  // True when no controls have been assessed — disables the Confirm button in the completion dialog.
  const isAllNotAssessed = controlStats.compliant === 0 && controlStats.nonCompliant === 0 && controlStats.notApplicable === 0

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/engagements">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Engagements
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{pkg?.name || 'Unknown Package'}</h1>
            {getStatusBadge(engagement.status)}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span>{pkg?.organization?.name || 'Unknown Organization'}</span>
            </div>
            <Badge variant="outline">{engagement.targetLevel.replace('_', ' ')}</Badge>
            {engagement.leadAssessor && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>Lead: {engagement.leadAssessor.name}</span>
              </div>
            )}
          </div>
          {pkg?.description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              {pkg.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {engagement.status === 'REQUESTED' && (
            <Button onClick={() => handleStatusChange('ACCEPTED')} disabled={isUpdating}>
              Accept Request
            </Button>
          )}
          {(engagement.status === 'ACCEPTED' || engagement.status === 'PROPOSAL_ACCEPTED') && (
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
                  <DialogDescription>
                    This will begin the formal assessment process
                  </DialogDescription>
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
                          Once you start the assessment, <strong>{pkg?.organization?.name}</strong>&apos;s
                          package will be set to read-only mode. They will not be able to upload
                          documents, modify assets, or make any changes until the assessment is complete.
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
          )}
          {/* Export to eMASS button - visible during active assessment and after completion */}
          {(engagement.status === 'IN_PROGRESS' || engagement.status === 'PENDING_APPROVAL' || engagement.status === 'COMPLETED') && (
            <Link href={`/engagements/${engagement.id}/emass-export`}>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export to eMASS
              </Button>
            </Link>
          )}
          {/* Stop Assessment - deactivate assessment mode, stay IN_PROGRESS */}
          {engagement.status === 'IN_PROGRESS' && engagement.assessmentModeActive && user.isLeadAssessor && (
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
                    This will deactivate assessment mode and unlock the customer&apos;s package. The assessment will remain in progress and can be resumed later.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowStopDialog(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleStopAssessment} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Stop Assessment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {/* Complete Assessment — unified dialog for IN_PROGRESS and PENDING_APPROVAL (lead assessor only) */}
          {(engagement.status === 'IN_PROGRESS' || engagement.status === 'PENDING_APPROVAL') && user.isLeadAssessor && (
            <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
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
                    Review the auto-detected CMMC status and confirm the final outcome. The lead assessor retains full override authority per CAP v2.0.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Zero-assessed warning */}
                  {isAllNotAssessed && (
                    <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-red-900 dark:text-red-100">No Objectives Assessed</p>
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            All controls are still marked as Not Assessed. Complete the control assessment before finalizing the outcome.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Auto-detected status banner */}
                  {autoDetectedStatus && selectedStatus && (
                    <div className={`rounded-lg border p-4 ${CMMCStatusConfig[selectedStatus].bgClass} ${CMMCStatusConfig[selectedStatus].borderClass}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-semibold ${CMMCStatusConfig[selectedStatus].textClass}`}>
                              {CMMCStatusConfig[selectedStatus].label}
                            </span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full cursor-help ${
                                    autoDetectedStatus.confidence === 'high'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                                  }`}>
                                    <Info className="h-3 w-3" />
                                    {autoDetectedStatus.confidence === 'high' ? 'High confidence' : 'Verify with lead'}
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

                  {/* Control stats summary */}
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
                      <div className="text-2xl font-bold text-muted-foreground">{controlStats.inProgress + controlStats.notStarted}</div>
                      <div className="text-xs text-muted-foreground mt-1">Not Assessed</div>
                    </div>
                  </div>

                  {/* Expiration date */}
                  {selectedStatus && selectedStatus !== 'NO_CMMC_STATUS' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>
                        {selectedStatus === 'FINAL_LEVEL_2'
                          ? `Certificate valid for 3 years — expires ${format(calculateExpirationDate('FINAL_LEVEL_2', new Date())!, 'PPP')}`
                          : `Conditional certificate expires in 180 days — ${format(calculateExpirationDate('CONDITIONAL_LEVEL_2', new Date())!, 'PPP')}`
                        }
                      </span>
                    </div>
                  )}

                  {/* Override dropdown */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Final Status (Lead Assessor Override)</label>
                    <p className="text-xs text-muted-foreground">Auto-detected from control results and POA&Ms. Override only when regulatory criteria require it.</p>
                    <Select value={selectedStatus || ''} onValueChange={(v) => setSelectedStatus(v as CMMCStatus)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FINAL_LEVEL_2">Final Level 2 — All requirements met (3-year certificate)</SelectItem>
                        <SelectItem value="CONDITIONAL_LEVEL_2">Conditional Level 2 — Valid POA&M exists (180-day certificate)</SelectItem>
                        <SelectItem value="NO_CMMC_STATUS">No CMMC Status — Requirements not met</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* CAP 3.15 warning for CERTIFICATION assessments */}
                  {engagement.assessmentType !== 'MOCK' && (
                    <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        <strong>CAP Section 3.15:</strong> Do not include remediation advice, mitigation guidance, or corrective action recommendations in result notes for certification assessments.
                      </p>
                    </div>
                  )}

                  {/* Result notes */}
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
                  <Button variant="outline" onClick={() => setShowResultDialog(false)}>Cancel</Button>
                  <Button
                    onClick={handleCompleteAssessment}
                    disabled={isUpdating || isAllNotAssessed || !selectedStatus}
                    className={
                      !selectedStatus ? '' :
                      selectedStatus === 'FINAL_LEVEL_2' ? 'bg-green-600 hover:bg-green-700 text-white' :
                      selectedStatus === 'CONDITIONAL_LEVEL_2' ? 'bg-amber-600 hover:bg-amber-700 text-white' :
                      'bg-red-600 hover:bg-red-700 text-white'
                    }
                  >
                    {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {selectedStatus ? `Confirm — ${CMMCStatusConfig[selectedStatus].label}` : 'Confirm'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {/* Write Report button - only for MOCK assessments */}
          {engagement.assessmentType === 'MOCK' && (engagement.status === 'IN_PROGRESS' || engagement.status === 'PENDING_APPROVAL') && user.isLeadAssessor && (
            <Link href={`/engagements/${engagement.id}/report`}>
              <Button variant="outline">
                <FileSignature className="h-4 w-4 mr-2" />
                Write Report
              </Button>
            </Link>
          )}
          {/* Submit for Approval - shown when IN_PROGRESS and user is assigned */}
          {engagement.status === 'IN_PROGRESS' && isUserAssigned && (
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
          )}
          {/* Send Back — lead assessor can return PENDING_APPROVAL to the team */}
          {engagement.status === 'PENDING_APPROVAL' && user.isLeadAssessor && (
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
          )}
          {/* Cancel / Decline / Withdraw Engagement */}
          {['REQUESTED', 'INTRODUCED', 'ACKNOWLEDGED', 'PROPOSAL_SENT', 'PROPOSAL_ACCEPTED', 'ACCEPTED', 'IN_PROGRESS', 'PENDING_APPROVAL'].includes(engagement.status) && (
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950/30">
                  <XCircle className="h-4 w-4 mr-2" />
                  {engagement.status === 'REQUESTED' ? 'Decline Request'
                    : ['IN_PROGRESS', 'PENDING_APPROVAL'].includes(engagement.status) ? 'Cancel Assessment'
                    : 'Cancel Engagement'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {engagement.status === 'REQUESTED' ? 'Decline Request'
                      : ['IN_PROGRESS', 'PENDING_APPROVAL'].includes(engagement.status) ? 'Cancel Assessment'
                      : 'Cancel Engagement'}
                  </DialogTitle>
                  <DialogDescription>
                    {engagement.status === 'REQUESTED'
                      ? `Decline the assessment request from ${pkg?.organization?.name || 'this organization'}. This cannot be undone.`
                      : ['IN_PROGRESS', 'PENDING_APPROVAL'].includes(engagement.status)
                      ? `Cancel the active assessment for ${pkg?.organization?.name || 'this organization'}. All assessment data for this engagement will be removed. This cannot be undone.`
                      : `Cancel this engagement with ${pkg?.organization?.name || 'this organization'}. This cannot be undone.`
                    }
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
                    {engagement.status === 'REQUESTED' ? 'Decline Request'
                      : ['IN_PROGRESS', 'PENDING_APPROVAL'].includes(engagement.status) ? 'Cancel Assessment'
                      : 'Cancel Engagement'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Assessment Mode Indicator (shown during active assessment) */}
      {engagement.status === 'IN_PROGRESS' && (
        <AssessmentModeIndicator
          active={engagement.assessmentModeActive}
          customerName={pkg?.organization?.name || 'Customer'}
          packageName={pkg?.name || 'Package'}
          engagementId={engagement.id}
          startedAt={engagement.assessmentModeStartedAt || undefined}
          isLeadAssessor={user.isLeadAssessor}
          onToggle={() => router.refresh()}
        />
      )}

      {/* Check-in Card (shown during IN_PROGRESS) */}
      {engagement.status === 'IN_PROGRESS' && (
        <CheckinCard
          engagementId={engagement.id}
          assessmentModeActive={engagement.assessmentModeActive}
        />
      )}

      {/* Read-Only Banner — shown for COMPLETED engagements */}
      {isReadOnly && (() => {
        const cmmcStatus = normalizeLegacyStatus(engagement.assessmentResult)
        const buttonLabel = cmmcStatus === 'FINAL_LEVEL_2' ? 'View Assessment Summary' : 'Start New Assessment from Record'
        return (
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="flex items-center justify-between gap-4 pt-6 flex-wrap">
              <div className="flex items-center gap-4">
                <Lock className="h-10 w-10 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">Assessment Complete — View Only</h3>
                  <p className="text-sm text-muted-foreground">
                    This engagement is complete and no further changes can be made. All assessment data is preserved for reference.
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowNewAssessmentDialog(true)}>
                <FileDown className="h-4 w-4 mr-2" />
                {buttonLabel}
              </Button>
            </CardContent>
          </Card>
        )
      })()}

      {/* Start New Assessment / View Summary Dialog */}
      {isReadOnly && (() => {
        const cmmcStatus = normalizeLegacyStatus(engagement.assessmentResult)
        const completionDate = safeDate(engagement.actualCompletionDate)
        const expirationDate = cmmcStatus && completionDate ? calculateExpirationDate(cmmcStatus, completionDate) : null
        const isConditional = cmmcStatus === 'CONDITIONAL_LEVEL_2'
        const isNoStatus = cmmcStatus === 'NO_CMMC_STATUS'
        const isFinal = cmmcStatus === 'FINAL_LEVEL_2'

        return (
          <Dialog open={showNewAssessmentDialog} onOpenChange={setShowNewAssessmentDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {isFinal ? 'Assessment Summary' : 'Start New Assessment from Record'}
                </DialogTitle>
                <DialogDescription>
                  {isFinal
                    ? 'Reference summary for this completed assessment.'
                    : 'Export this assessment\'s findings as a reference baseline for the next engagement.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Guidance section — varies by result type */}
                {isConditional && (
                  <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-amber-900 dark:text-amber-100">POA&M Closeout — Not a Full Re-Assessment</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          The OSC has <strong>180 days</strong> to remediate and close out the existing POA&M
                          {expirationDate ? ` (deadline: ${format(expirationDate, 'PPP')})` : ''}.
                          A new full assessment is <strong>not required</strong> for POA&M closeout —
                          any C3PAO (same or different) can perform the closeout against the existing record.
                          The closeout outcome will be either <strong>Final Level 2</strong> or <strong>No CMMC Status</strong>;
                          Conditional cannot be re-issued.
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                          <strong>Primary action:</strong> Contact the OSC to initiate POA&M closeout procedures.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {isNoStatus && (
                  <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-red-900 dark:text-red-100">Full Re-Assessment Required</p>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          All CMMC Level 2 requirements must be re-assessed in a new engagement. A new assessment must be initiated by the OSC through the platform. The reference baseline below shows exactly which controls were Not Met, which the OSC can use to scope their remediation work.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {isFinal && (
                  <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">Final Level 2 — Certified</p>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          This assessment resulted in Final Level 2 certification
                          {expirationDate ? `, valid through ${format(expirationDate, 'PPP')}` : ''}.
                          This summary can be used as a reference baseline for future assessments.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assessment summary stats */}
                <div>
                  <p className="text-sm font-medium mb-3">Assessment Findings</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-xl font-bold text-green-600">{controlStats.compliant}</div>
                      <div className="text-xs text-muted-foreground mt-1">Met</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="text-xl font-bold text-red-600">{controlStats.nonCompliant}</div>
                      <div className="text-xs text-muted-foreground mt-1">Not Met</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="text-xl font-bold text-muted-foreground">{controlStats.inProgress + controlStats.notStarted}</div>
                      <div className="text-xs text-muted-foreground mt-1">Not Assessed</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="text-xl font-bold text-orange-600">{pkg?.poams.length || 0}</div>
                      <div className="text-xs text-muted-foreground mt-1">POA&Ms</div>
                    </div>
                  </div>
                </div>

                {/* Export note */}
                <p className="text-xs text-muted-foreground">
                  Export the reference baseline to share with the OSC or use in a future assessment. The JSON format is machine-readable and can be imported by other tools.
                  {/* TODO: When the backend API supports direct engagement creation, replace these exports with a guided engagement pre-population flow. */}
                </p>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setShowNewAssessmentDialog(false)} className="sm:mr-auto">
                  Close
                </Button>
                <Button variant="outline" onClick={handleCopyBaseline}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy as Markdown
                </Button>
                <Button onClick={handleDownloadBaseline}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Download as JSON
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Pending Approval Banner */}
      {engagement.status === 'PENDING_APPROVAL' && (
        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardContent className="flex items-center gap-4 pt-6">
            <Clock className="h-10 w-10 text-orange-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-lg">Pending Lead Assessor Approval</h3>
              <p className="text-sm text-muted-foreground">
                {user.isLeadAssessor
                  ? 'This assessment is ready for your review. You can approve and complete it or send it back for more work.'
                  : 'This assessment has been submitted and is awaiting lead assessor approval.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment Result Banner — shown for all COMPLETED engagements */}
      {engagement.status === 'COMPLETED' && (() => {
        const cmmcStatus = normalizeLegacyStatus(engagement.assessmentResult)
        const completionDate = safeDate(engagement.actualCompletionDate) ?? new Date()
        const expirationDate = cmmcStatus ? calculateExpirationDate(cmmcStatus, completionDate) : null

        if (!cmmcStatus) {
          // Legacy completed engagement with no recorded result
          return (
            <Card className="bg-gray-500/5 border-gray-500/20">
              <CardContent className="flex items-center gap-4 pt-6">
                <Info className="h-10 w-10 text-gray-400 shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">Result Not Recorded</h3>
                  <p className="text-sm text-muted-foreground">No assessment result was recorded for this engagement.</p>
                </div>
              </CardContent>
            </Card>
          )
        }

        const config = CMMCStatusConfig[cmmcStatus]
        const Icon = cmmcStatus === 'FINAL_LEVEL_2' ? CheckCircle2 : cmmcStatus === 'CONDITIONAL_LEVEL_2' ? AlertTriangle : XCircle

        return (
          <Card className={`${config.bgClass} ${config.borderClass}`}>
            <CardContent className="flex items-center gap-4 pt-6">
              <Icon className={`h-10 w-10 ${
                cmmcStatus === 'FINAL_LEVEL_2' ? 'text-green-600' :
                cmmcStatus === 'CONDITIONAL_LEVEL_2' ? 'text-amber-600' : 'text-red-600'
              } shrink-0`} />
              <div>
                <h3 className={`font-semibold text-lg ${config.textClass}`}>{config.label}</h3>
                <p className={`text-sm ${config.textClass}`}>{config.description}</p>
                {expirationDate && (
                  <p className={`text-sm mt-1 ${config.textClass}`}>
                    {cmmcStatus === 'FINAL_LEVEL_2'
                      ? `Certificate valid through ${format(expirationDate, 'PPP')}`
                      : `POA&M closeout deadline: ${format(expirationDate, 'PPP')}`
                    }
                  </p>
                )}
                {engagement.resultNotes && (
                  <p className="text-sm mt-2 text-muted-foreground">{engagement.resultNotes}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{controlStats.total}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {assessedCount} assessed ({controlStats.total > 0 ? Math.round((assessedCount / controlStats.total) * 100) : 0}%)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Met</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{controlStats.compliant}</div>
            <div className="text-xs text-muted-foreground mt-1">Controls compliant</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Not Met</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{controlStats.nonCompliant}</div>
            <div className="text-xs text-muted-foreground mt-1">Gaps identified</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pkg?.evidence.length || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Files uploaded</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">POA&Ms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pkg?.poams.length || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Remediation items</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="controls" className="space-y-4">
        <TabsList className="flex w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="controls" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Controls</span>
            <Badge variant="secondary" className="ml-1">{controlStats.total}</Badge>
          </TabsTrigger>
          <TabsTrigger value="planning" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Planning</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Progress</span>
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Review</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Docs</span>
            {pkg?.ssp && <Badge variant="secondary" className="ml-1">SSP</Badge>}
          </TabsTrigger>
          <TabsTrigger value="evidence" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Evidence</span>
            <Badge variant="secondary" className="ml-1">{pkg?.evidence.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="stigs" className="gap-2">
            <FileJson className="h-4 w-4" />
            <span className="hidden sm:inline">STIGs</span>
          </TabsTrigger>
          <TabsTrigger value="poams" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">POA&Ms</span>
            <Badge variant="secondary" className="ml-1">{pkg?.poams.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
            <Badge variant="secondary" className="ml-1">{team.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Notes</span>
          </TabsTrigger>
        </TabsList>

        {/* Controls Tab */}
        <TabsContent value="controls">
          {pkg?.requirementStatuses && pkg.requirementStatuses.length > 0 ? (
            <AssessmentControlsTable
              requirementStatuses={pkg.requirementStatuses as unknown as RequirementStatus[]}
              readOnly={!engagement.assessmentModeActive}
              assessmentModeActive={engagement.assessmentModeActive}
              engagementId={engagement.id}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No Control Data</h3>
                <p className="text-muted-foreground mt-1">
                  No requirement statuses found for this package
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Planning Tab */}
        <TabsContent value="planning">
          <AssessmentPlanningBoard
            engagementId={engagement.id}
            isLeadAssessor={user.isLeadAssessor}
          />
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress">
          <AssessmentProgressTracker engagementId={engagement.id} />
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review">
          <FindingsReviewQueue
            engagementId={engagement.id}
            isLeadAssessor={user.isLeadAssessor}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <DocumentsViewer
            ssp={pkg?.ssp as SSP | null}
            assets={(pkg?.assets || []) as Asset[]}
            externalServiceProviders={(pkg?.externalServiceProviders || []) as ExternalServiceProvider[]}
          />
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence" className="space-y-4">
          {/* STIG Checklists Link */}
          <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <FileJson className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">STIG Checklists</p>
                  <p className="text-sm text-muted-foreground">
                    View STIG scan results imported by the OSC
                  </p>
                </div>
              </div>
              <Button variant="outline" asChild>
                <Link href={`/engagements/${engagement.id}/stigs`}>
                  View STIGs
                </Link>
              </Button>
            </CardContent>
          </Card>
          <EvidenceViewer evidence={pkg?.evidence || []} engagementId={engagement.id} />
        </TabsContent>

        {/* STIGs Tab */}
        <TabsContent value="stigs">
          {pkg?.id ? (
            <STIGViewer packageId={pkg.id} engagementId={engagement.id} assessmentModeActive={engagement.assessmentModeActive} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileJson className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No Package Data</h3>
                <p className="text-muted-foreground mt-1">
                  Package information is not available.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* POA&Ms Tab */}
        <TabsContent value="poams">
          <POAMViewer poams={(pkg?.poams || []) as POAM[]} />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          {loadingTeam ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading team...</p>
              </CardContent>
            </Card>
          ) : (
            <EngagementTeamCard
              engagementId={engagement.id}
              team={team as any}
              isLeadAssessor={user.isLeadAssessor}
              onTeamUpdated={loadTeam}
            />
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Details</CardTitle>
              <CardDescription>
                Timeline and engagement information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timeline */}
              <div>
                <h4 className="text-sm font-medium mb-3">Timeline</h4>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground">Request Date</div>
                      <div className="font-medium">{safeDate(engagement.createdAt) ? format(safeDate(engagement.createdAt)!, 'PPP') : '—'}</div>
                    </div>
                  </div>
                  {engagement.acceptedDate && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Accepted Date</div>
                        <div className="font-medium">{safeDate(engagement.acceptedDate) ? format(safeDate(engagement.acceptedDate)!, 'PPP') : '—'}</div>
                      </div>
                    </div>
                  )}
                  {engagement.actualStartDate && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Assessment Started</div>
                        <div className="font-medium">{safeDate(engagement.actualStartDate) ? format(safeDate(engagement.actualStartDate)!, 'PPP') : '—'}</div>
                      </div>
                    </div>
                  )}
                  {engagement.actualCompletionDate && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Assessment Completed</div>
                        <div className="font-medium">{safeDate(engagement.actualCompletionDate) ? format(safeDate(engagement.actualCompletionDate)!, 'PPP') : '—'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Notes */}
              {engagement.customerNotes && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Customer Notes</h4>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{engagement.customerNotes}</p>
                  </div>
                </div>
              )}

              {/* Package Info */}
              {pkg && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Package Information</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Package Name</div>
                      <div className="font-medium">{pkg.name}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">CMMC Level</div>
                      <div className="font-medium">{pkg.cmmcLevel.replace('_', ' ')}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Organization</div>
                      <div className="font-medium">{pkg.organization?.name || 'Unknown'}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Target Level</div>
                      <div className="font-medium">{engagement.targetLevel.replace('_', ' ')}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Assessor Notes</CardTitle>
              <CardDescription>
                Internal notes for your assessment team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add notes about this assessment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={8}
                className="resize-none"
                readOnly={isReadOnly}
                disabled={isReadOnly}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Notes are only visible to your C3PAO team
                </p>
                {!isReadOnly && (
                  <Button onClick={handleSaveNotes} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Notes
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Conflict Dialog */}
      <ConflictDialog
        open={conflictDialog.open}
        onOpenChange={(open) => setConflictDialog({ ...conflictDialog, open })}
        lastModifiedBy={conflictDialog.lastModifiedBy}
        onRefresh={() => {
          setConflictDialog({ open: false, lastModifiedBy: '' })
          router.refresh()
        }}
      />
    </div>
  )
}
