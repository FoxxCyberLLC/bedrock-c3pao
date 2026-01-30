'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
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
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { updateEngagementStatus, addAssessorNotes, recordAssessmentResult, startAssessment, endAssessmentMode, calculateEngagementSPRSScore, submitAssessmentForApproval, rejectAssessmentSubmission } from '@/app/actions/c3pao-dashboard'
import { toast } from 'sonner'
import { AssessmentControlsTable } from './assessment-controls-table'
import { POAMViewer } from './poam-viewer'
import { EvidenceViewer } from './evidence-viewer'
import { DocumentsViewer } from './documents-viewer'
import { AssessmentModeIndicator } from './assessment-mode-indicator'
import { EngagementTeamCard } from './engagement-team-card'
import { ConflictDialog } from './conflict-dialog'
import { STIGViewer } from './stig-viewer'
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

interface EngagementDetailProps {
  engagement: {
    id: string
    status: string
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
  const [assessmentPassed, setAssessmentPassed] = useState<string>('')
  const [findings, setFindings] = useState('')
  const [sprsScore, setSPRSScore] = useState<{
    score: number
    maxScore: number
    pointsDeducted: number
    metCount: number
    notMetCount: number
    scoreColor: { bgColor: string; textColor: string; label: string }
  } | null>(null)
  const [loadingSPRS, setLoadingSPRS] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [submissionNotes, setSubmissionNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [team, setTeam] = useState<{
    id: string
    engagementId: string
    assessorId: string
    role: EngagementAssessorRole
    assignedAt: Date
    assessor: {
      id: string
      name: string
      email: string
      jobTitle: string | null
      isLeadAssessor: boolean
      ccaNumber: string | null
      ccpNumber: string | null
    }
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

  // Load SPRS score on mount
  useEffect(() => {
    async function loadSPRSScore() {
      setLoadingSPRS(true)
      try {
        const result = await calculateEngagementSPRSScore(engagement.id)
        if (result.success && result.data) {
          setSPRSScore(result.data as typeof sprsScore)
        }
      } catch (error) {
        console.error('Failed to load SPRS score:', error)
      } finally {
        setLoadingSPRS(false)
      }
    }
    loadSPRSScore()
  }, [engagement.id])

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

  const handleRecordResult = async () => {
    if (!assessmentPassed) {
      toast.error('Please select a result')
      return
    }

    setIsUpdating(true)
    try {
      // Record the result
      const result = await recordAssessmentResult(
        engagement.id,
        assessmentPassed === 'passed',
        findings || undefined
      )
      if (result.success) {
        // End assessment mode to unlock customer package
        await endAssessmentMode(engagement.id)
        toast.success('Assessment completed - Customer package unlocked')
        setShowResultDialog(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to record result')
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

  // Check if current user is assigned to this engagement
  const isUserAssigned = team.some(t => t.assessorId === user.id && (t.role === 'LEAD' || t.role === 'ASSESSOR'))

  // Calculate control stats
  const controlStats = {
    total: pkg?.requirementStatuses.length || 0,
    compliant: pkg?.requirementStatuses.filter(c => c.status === 'COMPLIANT').length || 0,
    nonCompliant: pkg?.requirementStatuses.filter(c => c.status === 'NON_COMPLIANT').length || 0,
    inProgress: pkg?.requirementStatuses.filter(c => c.status === 'IN_PROGRESS').length || 0,
    notStarted: pkg?.requirementStatuses.filter(c => c.status === 'NOT_STARTED').length || 0,
    notApplicable: pkg?.requirementStatuses.filter(c => c.status === 'NOT_APPLICABLE').length || 0,
  }

  const assessedCount = controlStats.compliant + controlStats.nonCompliant + controlStats.notApplicable

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
          {/* Export to eMASS button - visible during IN_PROGRESS, PENDING_APPROVAL, or COMPLETED */}
          {(engagement.status === 'IN_PROGRESS' || engagement.status === 'PENDING_APPROVAL' || engagement.status === 'COMPLETED') && (
            <Link href={`/engagements/${engagement.id}/emass-export`}>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export to eMASS
              </Button>
            </Link>
          )}
          {/* Write Report button - visible during IN_PROGRESS, PENDING_APPROVAL, or COMPLETED */}
          {(engagement.status === 'IN_PROGRESS' || engagement.status === 'PENDING_APPROVAL' || engagement.status === 'COMPLETED') && user.isLeadAssessor && (
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
          {/* Approve Assessment - shown when PENDING_APPROVAL and user is lead assessor */}
          {engagement.status === 'PENDING_APPROVAL' && user.isLeadAssessor && (
            <>
              <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
                <DialogTrigger asChild>
                  <Button>Approve &amp; Complete</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Approve Assessment</DialogTitle>
                    <DialogDescription>
                      Record the final result and complete this CMMC assessment
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assessment Result</label>
                      <Select value={assessmentPassed} onValueChange={setAssessmentPassed}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select result..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="passed">Passed - Certification Recommended</SelectItem>
                          <SelectItem value="failed">Failed - Remediation Required</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Findings (Optional)</label>
                      <Textarea
                        placeholder="Enter any findings or notes..."
                        value={findings}
                        onChange={(e) => setFindings(e.target.value)}
                        rows={4}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowResultDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleRecordResult} disabled={isUpdating}>
                      {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Approve &amp; Complete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
            </>
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

      {/* Assessment Result Banner */}
      {engagement.status === 'COMPLETED' && engagement.assessmentResult && (
        <Card className={engagement.assessmentResult === 'PASSED' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}>
          <CardContent className="flex items-center gap-4 pt-6">
            {engagement.assessmentResult === 'PASSED' ? (
              <CheckCircle2 className="h-10 w-10 text-green-600 shrink-0" />
            ) : (
              <XCircle className="h-10 w-10 text-red-600 shrink-0" />
            )}
            <div>
              <h3 className="font-semibold text-lg">
                {engagement.assessmentResult === 'PASSED' ? 'Assessment Passed' : 'Assessment Failed'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {engagement.assessmentResult === 'PASSED'
                  ? 'This organization has been recommended for CMMC certification'
                  : 'Remediation is required before certification can be granted'}
              </p>
              {engagement.resultNotes && (
                <p className="text-sm mt-2">{engagement.resultNotes}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SPRS Score Card */}
      {sprsScore && (
        <Card className={`${sprsScore.scoreColor.bgColor} border-2`}>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <h3 className="font-semibold text-lg">SPRS Score</h3>
              <p className="text-sm text-muted-foreground">
                Supplier Performance Risk System score based on control compliance
              </p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${sprsScore.scoreColor.textColor}`}>
                {sprsScore.score > 0 ? `+${sprsScore.score}` : sprsScore.score}
              </div>
              <div className="text-sm text-muted-foreground">
                of {sprsScore.maxScore} max | {sprsScore.scoreColor.label}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {sprsScore.metCount} Met | {sprsScore.notMetCount} Not Met | -{sprsScore.pointsDeducted} points
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="controls" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Controls</span>
            <Badge variant="secondary" className="ml-1">{controlStats.total}</Badge>
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
          <EvidenceViewer evidence={pkg?.evidence || []} />
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
              team={team}
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
                      <div className="font-medium">{format(new Date(engagement.createdAt), 'PPP')}</div>
                    </div>
                  </div>
                  {engagement.acceptedDate && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Accepted Date</div>
                        <div className="font-medium">{format(new Date(engagement.acceptedDate), 'PPP')}</div>
                      </div>
                    </div>
                  )}
                  {engagement.actualStartDate && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Assessment Started</div>
                        <div className="font-medium">{format(new Date(engagement.actualStartDate), 'PPP')}</div>
                      </div>
                    </div>
                  )}
                  {engagement.actualCompletionDate && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Assessment Completed</div>
                        <div className="font-medium">{format(new Date(engagement.actualCompletionDate), 'PPP')}</div>
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
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Notes are only visible to your C3PAO team
                </p>
                <Button onClick={handleSaveNotes} disabled={isUpdating}>
                  {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Notes
                </Button>
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
