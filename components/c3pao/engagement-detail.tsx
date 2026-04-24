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
  Loader2,
  Calendar,
  User,
  Users,
  Clock,
  FileSignature,
  FileJson,
  ClipboardList,
  BarChart3,
  CheckSquare,
  Lock,
  Info,
  Copy,
  FileDown,
  FolderOpen,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getSSPLongFormDataForC3PAO, getAssetsForC3PAO, getStatsForC3PAO } from '@/app/actions/c3pao-dashboard'
import type { SSPView, AssetView, StatsResponse } from '@/lib/api-client'
import { OverviewTab } from './tabs/overview-tab'
import { SystemProfileTab } from './tabs/system-profile-tab'
import { NetworkTab } from './tabs/network-tab'
import { PersonnelTab } from './tabs/personnel-tab'
import { PoliciesTab } from './tabs/policies-tab'
import { AssetsTab } from './tabs/assets-tab'
import { PackageStatsSection } from './tabs/package-stats-section'
import { SnapshotTimeline } from './snapshot-timeline'
import type { AssessmentSnapshotView } from '@/lib/api-client'
import { determineCMMCStatus, calculateExpirationDate, CMMCStatusConfig, normalizeLegacyStatus } from '@/lib/cmmc/status-determination'
import { toast } from 'sonner'
import { AssessmentControlsTable } from './assessment-controls-table'
import { POAMViewer } from './poam-viewer'
import { EvidenceViewer } from './evidence-viewer'
import { AssessmentModeIndicator } from './assessment-mode-indicator'
import { EngagementTeamCard } from './engagement-team-card'
import { EngagementActions } from './engagement-actions'
import { CompletedEngagementSummary } from './completed-engagement-summary'
import { ConflictDialog } from './conflict-dialog'
import { STIGViewer } from './stig-viewer'
import { AssessmentPlanningBoard } from './assessment-planning-board'
import { EngagementLifecycleStepper } from './engagement/engagement-lifecycle-stepper'
import { EngagementOverview } from './engagement/engagement-overview'
import { EngagementSchedule } from './engagement/engagement-schedule'
import { ReadinessWorkspace } from './readiness/readiness-workspace'
import { NotesPanel } from './notes/notes-panel'
import { AssessmentProgressTracker } from './assessment-progress-tracker'
import { FindingsReviewQueue } from './findings-review-queue'
import { CheckinCard } from './checkin-card'
import { getEngagementTeam } from '@/app/actions/c3pao-team-assignment'
import {
  giveCorrectionOpportunityAction,
} from '@/app/actions/engagements'
import { derivePhaseFromStatus, type Phase } from '@/lib/portfolio/derive-risk'
import type { AuditEntry, ReadinessChecklist } from '@/lib/readiness-types'
import type { EngagementSchedule as EngagementScheduleData } from '@/lib/db-schedule'
import type { EngagementPhase, EngagementSummary } from '@/lib/api-client'

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

/** Convert an ISO date or Date object to an ISO string, defensively. */
function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return value
}

/**
 * Shape the locally-held engagement data into the `EngagementSummary` DTO the
 * `<EngagementOverview>` subtab expects. Fields the detail component never
 * loads (scheduledStartDate, accessLevel, etc.) fall back to sane defaults.
 */
function buildEngagementSummary(
  engagement: EngagementDetailProps['engagement'],
): EngagementSummary {
  return {
    id: engagement.id,
    customerId: engagement.atoPackage?.organization?.id ?? '',
    atoPackageId: engagement.atoPackage?.id ?? '',
    c3paoId: '',
    leadAssessorId: engagement.leadAssessor?.id ?? null,
    status: engagement.status,
    accessLevel: '',
    targetLevel: engagement.targetLevel ?? '',
    requestedDate: toIsoString(engagement.createdAt) ?? '',
    acceptedDate: toIsoString(engagement.acceptedDate),
    scheduledStartDate: null,
    scheduledEndDate: null,
    actualStartDate: toIsoString(engagement.actualStartDate),
    actualCompletionDate: toIsoString(engagement.actualCompletionDate),
    assessmentScope: null,
    assessmentNotes: engagement.assessmentNotes ?? null,
    assessmentResult: engagement.assessmentResult ?? null,
    findingsCount: null,
    poamRequired: null,
    assessmentModeActive: Boolean(engagement.assessmentModeActive),
    createdAt: toIsoString(engagement.createdAt) ?? '',
    updatedAt: toIsoString(engagement.updatedAt) ?? '',
    packageName: engagement.atoPackage?.name ?? 'Unknown Package',
    organizationName:
      engagement.atoPackage?.organization?.name ?? 'Unknown Organization',
    leadAssessorName: engagement.leadAssessor?.name ?? null,
  }
}

interface EngagementDetailProps {
  // Minimal-payload safety: getEngagementById returns only `{id, status, assessmentResult}`
  // for COMPLETED engagements (deliberate API behavior — see app/actions/engagements.ts:63).
  // Most fields below are therefore optional. The COMPLETED short-circuit at the top of
  // EngagementDetail renders <CompletedEngagementSummary> instead of the full layout, so
  // the rest of this component can assume non-COMPLETED data is fully populated.
  engagement: {
    id: string
    status: string
    assessmentType?: string
    targetLevel?: string
    customerNotes?: string | null
    assessmentNotes?: string | null
    assessmentResult?: string | null
    resultNotes?: string | null
    createdAt?: Date
    updatedAt?: Date
    acceptedDate?: Date | null
    actualStartDate?: Date | null
    actualCompletionDate?: Date | null
    assessmentModeActive?: boolean
    assessmentModeStartedAt?: Date | null
    atoPackage?: {
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
    leadAssessor?: {
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
  initialChecklist: ReadinessChecklist
  initialAuditEntries: AuditEntry[]
  initialSchedule: EngagementScheduleData | null
  initialPhase: EngagementPhase | null
  currentPhase: string | null
  /** Snapshots captured across determination + correction cycles. Empty array for pre-snapshot engagements. */
  initialSnapshots?: AssessmentSnapshotView[]
}

export function EngagementDetail({
  engagement,
  user,
  initialChecklist,
  initialAuditEntries,
  initialSchedule,
  initialPhase,
  currentPhase,
  initialSnapshots = [],
}: EngagementDetailProps) {
  // COMPLETED engagements arrive with a deliberately minimal payload from
  // getEngagementById (`{id, status, assessmentResult}` only). Bail out
  // before any hook is called so the rest of this component can assume
  // non-COMPLETED data is fully populated.
  if (engagement.status === 'COMPLETED' && !engagement.targetLevel) {
    return <CompletedEngagementSummary engagement={engagement} />
  }

  return (
    <EngagementDetailFull
      engagement={engagement}
      user={user}
      initialChecklist={initialChecklist}
      initialAuditEntries={initialAuditEntries}
      initialSchedule={initialSchedule}
      initialPhase={initialPhase}
      currentPhase={currentPhase}
      initialSnapshots={initialSnapshots}
    />
  )
}

function EngagementDetailFull({
  engagement,
  user,
  initialChecklist,
  initialAuditEntries,
  initialSchedule,
  initialPhase,
  currentPhase,
  initialSnapshots = [],
}: EngagementDetailProps) {
  const router = useRouter()

  // Resolve CAP v2.0 phase once for the section visibility migration (Task M5).
  const resolvedPhase: Phase | null =
    (currentPhase as Phase | null) ??
    derivePhaseFromStatus(engagement.status, engagement.assessmentResult ?? null)

  const [isUpdating, setIsUpdating] = useState(false)
  const [showNewAssessmentDialog, setShowNewAssessmentDialog] = useState(false)
  // Correction-cycle confirmation dialog (Give Correction Opportunity from the
  // read-only banner). Resume Re-Evaluation moved to <EngagementActions>.
  const [showCorrectionStartDialog, setShowCorrectionStartDialog] = useState(false)

  // Per-engagement lead check — visibility of the correction buttons is
  // scoped to the engagement's designated lead assessor, not the user's
  // global isLeadAssessor flag (which is an org-admin concern).
  const isCurrentUserEngagementLead = Boolean(
    engagement.leadAssessor?.id && engagement.leadAssessor.id === user.id,
  )

  // A "failed" determination — any value outside FINAL_LEVEL_2 / PASSED —
  // qualifies for a correction opportunity. Legacy values accepted alongside
  // modern CMMC codes so this works during the transition.
  const determinationIsFailure = (() => {
    const r = engagement.assessmentResult
    if (!r) return false
    return (
      r === 'FAILED' ||
      r === 'CONDITIONAL' ||
      r === 'NO_CMMC_STATUS' ||
      r === 'CONDITIONAL_LEVEL_2'
    )
  })()
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

  // SSP and assets data for read-only OSC views
  const [sspData, setSspData] = useState<SSPView | null>(null)
  const [sspLoading, setSspLoading] = useState(true)
  const [assetsData, setAssetsData] = useState<AssetView[]>([])
  const [assetsLoading, setAssetsLoading] = useState(true)
  const [assessorStats, setAssessorStats] = useState<StatsResponse | null>(null)
  const [assessorStatsState, setAssessorStatsState] = useState<'loading' | 'ready' | 'error'>('loading')

  // Sectioned tab navigation
  type NavSection = 'package' | 'assessment' | 'engagement'
  const [section, setSection] = useState<NavSection>('package')
  const [tabValue, setTabValue] = useState('overview')

  const handleSectionChange = (newSection: NavSection) => {
    const defaults: Record<NavSection, string> = {
      package: 'overview',
      assessment: 'planning',
      engagement: 'engagement-overview',
    }
    setSection(newSection)
    setTabValue(defaults[newSection])
  }

  const pkg = engagement.atoPackage

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

  useEffect(() => {
    let cancelled = false
    async function loadSSP() {
      setSspLoading(true)
      const result = await getSSPLongFormDataForC3PAO(engagement.id)
      if (!cancelled) {
        setSspData(result.success && result.data ? result.data as SSPView : null)
        setSspLoading(false)
      }
    }
    async function loadAssets() {
      setAssetsLoading(true)
      const result = await getAssetsForC3PAO(engagement.id)
      if (!cancelled) {
        setAssetsData(result.success && result.data ? result.data : [])
        setAssetsLoading(false)
      }
    }
    async function loadStats() {
      const result = await getStatsForC3PAO(engagement.id)
      if (cancelled) return
      if (result.success && result.data) {
        setAssessorStats(result.data)
        setAssessorStatsState('ready')
      } else {
        console.warn('SPRS stats unavailable (non-fatal):', result.error)
        setAssessorStatsState('error')
      }
    }
    loadSSP()
    loadAssets()
    loadStats()
    return () => { cancelled = true }
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

  const handleGiveCorrectionOpportunity = async () => {
    setIsUpdating(true)
    try {
      const result = await giveCorrectionOpportunityAction(engagement.id)
      if (result.success) {
        toast.success('Correction opportunity opened. The OSC can now update their package.')
        setShowCorrectionStartDialog(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to start correction opportunity')
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

  // (Auto-detected status seeding moved into <EngagementActions>, which now
  // owns the Complete dialog state.)

  // Calculate control stats (memoized to avoid 5× filter on every render)
  const controlStats = useMemo(() => ({
    total: pkg?.requirementStatuses.length || 0,
    compliant: pkg?.requirementStatuses.filter(c => c.status === 'COMPLIANT').length || 0,
    nonCompliant: pkg?.requirementStatuses.filter(c => c.status === 'NON_COMPLIANT').length || 0,
    inProgress: pkg?.requirementStatuses.filter(c => c.status === 'IN_PROGRESS').length || 0,
    notStarted: pkg?.requirementStatuses.filter(c => c.status === 'NOT_STARTED').length || 0,
    notApplicable: pkg?.requirementStatuses.filter(c => c.status === 'NOT_APPLICABLE').length || 0,
  }), [pkg])

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/engagements">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Engagements
        </Link>
      </Button>

      {/* CAP v2.0 lifecycle stepper (Task 14). CANCELLED maps to phase===null,
          which is the same set of engagements that should hide the stepper. */}
      {resolvedPhase !== null && (
        <EngagementLifecycleStepper
          engagementId={engagement.id}
          initialPhase={initialPhase}
        />
      )}

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
            <Badge variant="outline">{engagement.targetLevel?.replace('_', ' ') ?? '—'}</Badge>
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

        <EngagementActions
          engagement={engagement}
          user={user}
          team={team}
          currentPhase={currentPhase}
          autoDetectedStatus={autoDetectedStatus}
          controlStats={controlStats}
        />
      </div>

      {/* Assessment Mode Indicator. Phase===ASSESS is the migrated check;
          AWAITING_OSC_CORRECTIONS still maps to ASSESS, so the indicator was
          previously hidden by the strict IN_PROGRESS gate. We preserve that
          hide via the explicit AWAITING_OSC_CORRECTIONS exclusion below. */}
      {resolvedPhase === 'ASSESS' && engagement.status !== 'AWAITING_OSC_CORRECTIONS' && (
        <AssessmentModeIndicator
          active={Boolean(engagement.assessmentModeActive)}
          customerName={pkg?.organization?.name || 'Customer'}
          packageName={pkg?.name || 'Package'}
          engagementId={engagement.id}
          startedAt={engagement.assessmentModeStartedAt || undefined}
          isLeadAssessor={user.isLeadAssessor}
          onToggle={() => router.refresh()}
        />
      )}

      {/* Awaiting OSC Corrections banner. Status check kept intentionally —
          this is a sub-state within the ASSESS phase, not a phase concept.
          The Resume Re-Evaluation action lives in <EngagementActions>. */}
      {engagement.status === 'AWAITING_OSC_CORRECTIONS' && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="font-semibold">Awaiting OSC Corrections</h3>
              <p className="text-sm text-muted-foreground">
                The OSC has regained access to update items flagged Not Met. Resume re-evaluation
                when they&apos;ve indicated their updates are ready.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check-in Card — ASSESS phase, but not during the AWAITING_OSC_CORRECTIONS
          sub-state where the OSC owns the package. */}
      {resolvedPhase === 'ASSESS' && engagement.status !== 'AWAITING_OSC_CORRECTIONS' && (
        <CheckinCard
          engagementId={engagement.id}
          assessmentModeActive={Boolean(engagement.assessmentModeActive)}
        />
      )}

      {/* Read-Only Banner — shown for COMPLETED engagements */}
      {isReadOnly && (() => {
        const cmmcStatus = normalizeLegacyStatus(engagement.assessmentResult)
        const buttonLabel = cmmcStatus === 'FINAL_LEVEL_2' ? 'View Assessment Summary' : 'Start New Assessment from Record'
        const showCorrectionAction = determinationIsFailure && isCurrentUserEngagementLead
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
              <div className="flex flex-wrap items-center gap-2">
                {showCorrectionAction && (
                  <Button
                    variant="default"
                    onClick={() => setShowCorrectionStartDialog(true)}
                    disabled={isUpdating}
                    aria-label="Give Correction Opportunity"
                  >
                    Give Correction Opportunity
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowNewAssessmentDialog(true)}>
                  <FileDown className="h-4 w-4 mr-2" />
                  {buttonLabel}
                </Button>
              </div>
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

      {/* Pending Approval Banner. Phase check + status sub-condition: REPORT
          phase contains both PENDING_APPROVAL and COMPLETED, but only the
          former should show this banner. */}
      {resolvedPhase === 'REPORT' && engagement.status === 'PENDING_APPROVAL' && (
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

      {/* Send Back rework banner. Phase stays REPORT after Send Back (the API
          regresses status from PENDING_APPROVAL → IN_PROGRESS but does NOT
          regress phase). This banner explains why the engagement is back in
          IN_PROGRESS without losing the Report-phase context. */}
      {engagement.status === 'IN_PROGRESS' && resolvedPhase === 'REPORT' && (
        <Card className="border-blue-500/40 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-semibold">Reworking findings</h3>
                <p className="text-sm text-muted-foreground">
                  The lead assessor sent this back for additional work. The engagement remains in the Report phase; submit again when ready.
                </p>
              </div>
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

      {/* Snapshot timeline — renders nothing when engagement has no captured snapshots yet. */}
      <SnapshotTimeline snapshots={initialSnapshots} />

      {/* Package Stats */}
      <PackageStatsSection
        controlStats={assessorStats ? {
          total: assessorStats.totals.total,
          compliant: assessorStats.totals.met,
          nonCompliant: assessorStats.totals.notMet,
          inProgress: 0,
          notStarted: assessorStats.totals.notAssessed,
          notApplicable: assessorStats.totals.notApplicable,
        } : controlStats}
        evidenceCount={pkg?.evidence.length || 0}
        assetCount={assetsData.length}
        sprsScore={assessorStats?.sprsScore}
        sprsMaxScore={assessorStats?.sprsMaxScore}
        pointsDeducted={assessorStats?.pointsDeducted}
        sprsState={assessorStatsState}
      />

      {/* Sectioned Navigation */}
      <div className="space-y-4">
        {/* Section Switcher */}
        <div className="flex items-center gap-0.5 bg-muted/40 p-1 rounded-lg w-fit border">
          {(['package', 'assessment', 'engagement'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSectionChange(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                section === s
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'package' && <Building2 className="h-4 w-4 shrink-0" />}
              {s === 'assessment' && <Shield className="h-4 w-4 shrink-0" />}
              {s === 'engagement' && <Users className="h-4 w-4 shrink-0" />}
              <span className="hidden sm:inline capitalize">
                {s === 'package' ? 'Package Data' : s === 'assessment' ? 'Assessment' : 'Engagement'}
              </span>
            </button>
          ))}
        </div>

      {/* Tabs */}
      <Tabs value={tabValue} onValueChange={setTabValue} className="space-y-4">
        <TabsList className="flex w-full flex-wrap h-auto gap-1">
          {section === 'package' && (
            <>
              <TabsTrigger value="overview" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="system-profile" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">System Profile</span>
              </TabsTrigger>
              <TabsTrigger value="network" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Network</span>
              </TabsTrigger>
              <TabsTrigger value="personnel" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Personnel</span>
              </TabsTrigger>
              <TabsTrigger value="policies" className="gap-2">
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">Policies</span>
              </TabsTrigger>
              <TabsTrigger value="assets" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Assets</span>
                <Badge variant="secondary" className="ml-1">{assetsData.length}</Badge>
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
              <TabsTrigger value="full-ssp" className="gap-2">
                <FileSignature className="h-4 w-4" />
                <span className="hidden sm:inline">Full SSP</span>
              </TabsTrigger>
            </>
          )}
          {section === 'assessment' && (
            <>
              <TabsTrigger value="planning" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Planning</span>
              </TabsTrigger>
              <TabsTrigger value="controls" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Controls</span>
                <Badge variant="secondary" className="ml-1">{controlStats.total}</Badge>
              </TabsTrigger>
              <TabsTrigger value="progress" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Progress</span>
              </TabsTrigger>
              <TabsTrigger value="review" className="gap-2">
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Review</span>
              </TabsTrigger>
            </>
          )}
          {section === 'engagement' && (
            <>
              <TabsTrigger value="engagement-overview" className="gap-2">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="schedule-logistics" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Schedule &amp; Logistics</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <OverviewTab ssp={sspData} sspLoading={sspLoading} engagementName={pkg?.name} engagementId={engagement.id} />
        </TabsContent>

        {/* System Profile Tab */}
        <TabsContent value="system-profile">
          <SystemProfileTab ssp={sspData} sspLoading={sspLoading} />
        </TabsContent>

        {/* Network Tab */}
        <TabsContent value="network">
          <NetworkTab ssp={sspData} sspLoading={sspLoading} engagementId={engagement.id} />
        </TabsContent>

        {/* Personnel Tab */}
        <TabsContent value="personnel">
          <PersonnelTab ssp={sspData} sspLoading={sspLoading} />
        </TabsContent>

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

        {/* Policies Tab */}
        <TabsContent value="policies">
          <PoliciesTab ssp={sspData} sspLoading={sspLoading} />
        </TabsContent>

        {/* Planning Tab — readiness workspace + team card + planning board */}
        <TabsContent value="planning" className="space-y-6">
          <ReadinessWorkspace
            engagementId={engagement.id}
            initialChecklist={initialChecklist}
            initialAuditEntries={initialAuditEntries}
            isLead={user.isLeadAssessor}
            currentUserEmail={user.email}
          />
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
        <TabsContent value="review" className="space-y-6">
          <FindingsReviewQueue
            engagementId={engagement.id}
            isLeadAssessor={user.isLeadAssessor}
          />
          <NotesPanel
            engagementId={engagement.id}
            currentUserId={user.id}
            leadAssessorId={engagement.leadAssessor?.id ?? null}
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
            <STIGViewer engagementId={engagement.id} assessmentModeActive={engagement.assessmentModeActive} />
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

        {/* Assets Tab */}
        <TabsContent value="assets">
          <AssetsTab assets={assetsData} assetsLoading={assetsLoading} ssp={sspData} />
        </TabsContent>

        {/* POA&Ms Tab */}
        <TabsContent value="poams">
          <POAMViewer poams={(pkg?.poams || []) as POAM[]} />
        </TabsContent>

        {/* Full SSP Tab */}
        <TabsContent value="full-ssp">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileSignature className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">Full System Security Plan</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                View the complete SSP document as formatted by the OSC.
              </p>
              <Button asChild>
                <Link href={`/engagements/${engagement.id}/ssp`}>
                  Open Full SSP
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement — Overview Tab */}
        <TabsContent value="engagement-overview">
          <EngagementOverview
            engagement={buildEngagementSummary(engagement)}
            currentPhase={currentPhase}
            isLead={user.isLeadAssessor}
          />
        </TabsContent>

        {/* Engagement — Schedule & Logistics Tab */}
        <TabsContent value="schedule-logistics">
          <EngagementSchedule
            engagementId={engagement.id}
            initialSchedule={initialSchedule}
            isLead={user.isLeadAssessor}
          />
        </TabsContent>
      </Tabs>
      </div>

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

      {/* Give Correction Opportunity confirmation dialog */}
      <Dialog open={showCorrectionStartDialog} onOpenChange={setShowCorrectionStartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give Correction Opportunity?</DialogTitle>
            <DialogDescription>
              This will request OSC corrections for the controls flagged Not Met. The OSC will
              regain edit access to their package until you resume re-evaluation. A new snapshot
              is created when you re-submit a determination.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowCorrectionStartDialog(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleGiveCorrectionOpportunity} disabled={isUpdating}>
              {isUpdating ? 'Working…' : 'Start Correction Cycle'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
