'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { safeDate } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Minus,
  FileText,
  Download,
  ScrollText,
  StickyNote,
  Building2,
  Shield,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Save,
  MessageSquare,
  User,
  Wrench,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { updateAssessorNotes, getEvidenceDownloadUrlForC3PAO } from '@/app/actions/c3pao-dashboard'
import { triggerFileDownload } from '@/lib/download'
import { toast } from 'sonner'
import { ObjectiveAssessmentCard } from './objective-assessment-card'
import { OSCObjectiveCard } from './osc-objective-card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface Evidence {
  id: string
  fileName: string
  fileUrl: string | null
  mimeType: string | null
  fileSize: number | null
  description: string | null
  createdAt: Date
}

type InheritedStatus = 'NONE' | 'PARTIAL' | 'FULL'

interface ObjectiveStatus {
  id?: string
  status: 'NOT_ASSESSED' | 'MET' | 'NOT_MET' | 'NOT_APPLICABLE'
  assessmentNotes: string | null
  evidenceDescription: string | null
  implementationStatement: string | null
  officialAssessment?: boolean
  officialAssessorId?: string | null
  officialAssessedAt?: Date | null
  version: number
  // eMASS fields
  artifactsReviewed: string | null
  interviewees: string | null
  examineDescription: string | null
  testDescription: string | null
  timeToAssessMinutes: number | null
  inheritedStatus: InheritedStatus | null
  dependentESPId: string | null
  assessorQuestionsForOSC?: string | null
}

interface ESP {
  id: string
  providerName: string
}

interface AssessmentObjective {
  id: string
  objectiveId: string
  objectiveReference: string
  description: string
  questionsForOSC: string | null
  sortOrder: number
  statuses?: ObjectiveStatus[]
  // OSC-authored per-objective mappings surfaced read-only on assessor side
  evidenceMappings?: Array<{
    evidenceId: string
    fileName: string
    fileUrl: string | null
    mimeType: string | null
    fileSize: number | null
    description: string | null
    uploadedAt: string
  }>
  espMappings?: Array<{
    id: string
    espId: string
    providerName: string
    inheritanceType: string | null
    espResponsibility: string | null
    oscResponsibility: string | null
  }>
  // OSC's own inheritance claim from the package-scoped ObjectiveStatus row
  oscInheritedStatus?: string | null
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
  objectives?: AssessmentObjective[]
}

interface RequirementStatus {
  id: string
  status: string
  implementationNotes: string | null
  implementationType?: string | null
  processOwner?: string | null
  assessmentNotes: string | null
  requirement: Requirement
  evidence: Evidence[]
}

interface ControlDetailPageProps {
  engagementId: string
  engagement: {
    id: string
    status: string
    assessmentModeActive: boolean
    atoPackage: {
      id: string
      name: string
      organization: {
        id: string
        name: string
      } | null
      externalServiceProviders?: ESP[]
    } | null
  }
  control: RequirementStatus
  navigation: {
    prevId: string | null
    prevName: string | null
    nextId: string | null
    nextName: string | null
    currentIndex: number
    total: number
  }
  user: {
    id: string
    name: string
    email: string
    isLeadAssessor: boolean
  }
  currentPhase: string | null
  /** Engagement kind. Forwarded to ObjectiveAssessmentCard for write dispatch. */
  engagementKind?: 'osc' | 'outside_osc'
}

const oscStatusConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  NOT_STARTED: { label: 'Not Started', icon: Minus, color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  COMPLIANT: { label: 'Met', icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  NON_COMPLIANT: { label: 'Not Met', icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  NOT_APPLICABLE: { label: 'N/A', icon: AlertCircle, color: 'text-gray-400', bgColor: 'bg-gray-400/10' },
}

const familyColors: Record<string, string> = {
  AC: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  AT: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  AU: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  CM: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  IA: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  IR: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  MA: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  MP: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  PS: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  PE: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  RA: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  SA: 'bg-lime-500/10 text-lime-700 dark:text-lime-400 border-lime-500/20',
  SC: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  SI: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown size'
  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let size = bytes
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export function ControlDetailPage({
  engagementId,
  engagement,
  control,
  navigation,
  currentPhase,
  engagementKind = 'osc',
}: ControlDetailPageProps) {
  const isPhase1Locked = currentPhase === 'PRE_ASSESS'
  const router = useRouter()
  const [assessorNotes, setAssessorNotes] = useState(control.assessmentNotes || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesChanged, setNotesChanged] = useState(false)
  const [reqDetailsOpen, setReqDetailsOpen] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleEvidenceDownload = async (evidenceId: string, fileName: string) => {
    setDownloadingId(evidenceId)
    try {
      const result = await getEvidenceDownloadUrlForC3PAO(evidenceId, engagementId)
      if (result.success && result.data) {
        triggerFileDownload(result.data.url, fileName)
        toast.success(`Downloading ${fileName}`)
      } else {
        toast.error(result.error || 'Could not generate download URL')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleNotesChange = (value: string) => {
    setAssessorNotes(value)
    setNotesChanged(value !== (control.assessmentNotes || ''))
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      const result = await updateAssessorNotes({
        engagementId,
        requirementStatusId: control.id,
        assessmentNotes: assessorNotes,
      })
      if (result.success) {
        toast.success('Assessor notes saved')
        setNotesChanged(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to save notes')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setSavingNotes(false)
    }
  }

  const oscStatus = oscStatusConfig[control.status] || oscStatusConfig.NOT_STARTED
  const OscStatusIcon = oscStatus.icon
  const objectives = control.requirement.objectives || []
  const assessmentModeActive = engagement.assessmentModeActive

  // C3PAO assessment stats
  const objectivesAssessed = objectives.filter(
    obj => obj.statuses?.[0]?.status && obj.statuses[0].status !== 'NOT_ASSESSED'
  ).length
  const objectivesMet = objectives.filter(
    obj => obj.statuses?.[0]?.status === 'MET'
  ).length
  const objectivesNotMet = objectives.filter(
    obj => obj.statuses?.[0]?.status === 'NOT_MET'
  ).length

  return (
    <>
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href={`/engagements/${engagementId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Controls
          </Link>
        </Button>

        {/* Navigation */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Control {navigation.currentIndex} of {navigation.total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={!navigation.prevId}
              asChild={!!navigation.prevId}
            >
              {navigation.prevId ? (
                <Link href={`/engagements/${engagementId}/control/${navigation.prevId}`}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {navigation.prevName}
                </Link>
              ) : (
                <span><ChevronLeft className="h-4 w-4 mr-1" />Prev</span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!navigation.nextId}
              asChild={!!navigation.nextId}
            >
              {navigation.nextId ? (
                <Link href={`/engagements/${engagementId}/control/${navigation.nextId}`}>
                  {navigation.nextName}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              ) : (
                <span>Next<ChevronRight className="h-4 w-4 ml-1" /></span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>{engagement.atoPackage?.organization?.name}</span>
        <span>/</span>
        <span>{engagement.atoPackage?.name}</span>
        <span>/</span>
        <span className="text-foreground font-medium">{control.requirement.requirementId}</span>
      </div>

      {/* Control Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Badge className={`${familyColors[control.requirement.family.code] || 'bg-gray-500/10'} text-lg px-3 py-1`}>
              {control.requirement.family.code}
            </Badge>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <code className="font-mono">{control.requirement.requirementId}</code>
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                {control.requirement.title}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {control.requirement.family.name}
              </p>
            </div>
          </div>

          {/* Status badges: OSC + C3PAO */}
          <div className="flex flex-col gap-2 items-end">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${oscStatus.bgColor}`}>
              <span className="text-xs font-medium text-muted-foreground">OSC:</span>
              <OscStatusIcon className={`h-4 w-4 ${oscStatus.color}`} />
              <span className={`text-sm font-semibold ${oscStatus.color}`}>{oscStatus.label}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-xs font-medium text-muted-foreground">C3PAO:</span>
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {objectivesAssessed}/{objectives.length} assessed
              </span>
              {objectivesNotMet > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0">{objectivesNotMet} Not Met</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Assessment Mode Banner */}
        {assessmentModeActive && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-medium text-amber-800 dark:text-amber-200">Assessment Mode Active</span>
              <span className="text-amber-700 dark:text-amber-300 ml-2">
                — You can update objective statuses as official C3PAO assessments
              </span>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Main Content — Two Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══ LEFT COLUMN: OSC Self-Assessment (read-only) ═══ */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            OSC Self-Assessment
            <Badge variant="outline" className="text-xs font-normal">Read-Only</Badge>
          </h2>

          {/* OSC Objectives */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Self-Assessment ({objectives.length})
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {objectives.filter(obj => {
                    const s = obj.statuses?.[0]
                    return s && (s.implementationStatement || s.evidenceDescription || s.assessmentNotes)
                  }).length}/{objectives.length} provided
                </span>
              </CardTitle>
              <CardDescription>
                Per-objective implementation data from the OSC
                {(control.implementationType || control.processOwner) && (
                  <span className="block mt-1">
                    {control.implementationType && <span className="inline-flex items-center gap-1 mr-3"><Wrench className="h-3 w-3 inline" /> {control.implementationType}</span>}
                    {control.processOwner && <span className="inline-flex items-center gap-1"><User className="h-3 w-3 inline" /> {control.processOwner}</span>}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {objectives.length > 0 ? (
                objectives.map((obj) => (
                  <OSCObjectiveCard
                    key={obj.id}
                    objective={obj}
                    engagementId={engagementId}
                    oscContext={{
                      inheritedStatus: obj.oscInheritedStatus ?? null,
                      evidenceMappings: obj.evidenceMappings ?? [],
                      espMappings: obj.espMappings ?? [],
                    }}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p>No assessment objectives defined for this control</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Implementation Notes (control-level) */}
          {control.implementationNotes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <StickyNote className="h-4 w-4" />
                  Implementation Notes
                </CardTitle>
                <CardDescription>How the organization implements this control</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {control.implementationNotes}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evidence */}
          <Card className="relative isolate overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Evidence ({control.evidence.length})
              </CardTitle>
              <CardDescription>Supporting documentation for this control</CardDescription>
            </CardHeader>
            <CardContent>
              {control.evidence.length > 0 ? (
                <div className="space-y-3">
                  {control.evidence.map((ev) => (
                    <div key={ev.id} className="relative p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{ev.fileName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatFileSize(ev.fileSize)} • {safeDate(ev.createdAt) ? format(safeDate(ev.createdAt)!, 'MMM d, yyyy') : '--'}
                          </div>
                          {ev.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          asChild
                        >
                          <Link href={`/engagements/${engagementId}/evidence/${ev.id}`}>
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Review
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={downloadingId === ev.id}
                          onClick={() => handleEvidenceDownload(ev.id, ev.fileName)}
                        >
                          {downloadingId === ev.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3 mr-1" />
                          )}
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed rounded-lg">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No evidence linked to this control</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Requirement Details (collapsible reference) */}
          <Collapsible open={reqDetailsOpen} onOpenChange={setReqDetailsOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <ScrollText className="h-4 w-4" />
                      Requirement Details
                    </span>
                    {reqDetailsOpen ? (
                      <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                  <CardDescription>NIST SP 800-171 requirement text</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Basic Security Requirement</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {control.requirement.basicRequirement}
                    </p>
                  </div>
                  {control.requirement.derivedRequirement && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Derived Security Requirement</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {control.requirement.derivedRequirement}
                      </p>
                    </div>
                  )}
                  {control.requirement.discussion && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Discussion</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {control.requirement.discussion}
                      </p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* ═══ RIGHT COLUMN: C3PAO Assessment (editable) ═══ */}
        <div className="space-y-6">
          {isPhase1Locked && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm">
              <strong>Phase 1 — OSC Self-Assessment in progress.</strong> The C3PAO assessment opens at Phase 2 (Assess).
            </div>
          )}
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-600" />
            C3PAO Assessment
          </h2>

          {/* Assessment Objectives */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Assessment Objectives ({objectives.length})
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {objectivesAssessed}/{objectives.length} assessed
                  {objectivesMet > 0 && <span className="text-green-600 ml-2">{objectivesMet} Met</span>}
                  {objectivesNotMet > 0 && <span className="text-red-600 ml-2">{objectivesNotMet} Not Met</span>}
                </span>
              </CardTitle>
              <CardDescription>
                Per NIST SP 800-171A, each objective must be individually assessed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {objectives.length > 0 ? (
                objectives.map((objective) => {
                  const objStatus = objective.statuses?.[0]

                  return (
                    <ObjectiveAssessmentCard
                      key={objective.id}
                      engagementId={engagementId}
                      objective={{
                        id: objective.id,
                        objectiveReference: objective.objectiveReference,
                        description: objective.description,
                        questionsForOSC: objective.questionsForOSC,
                      }}
                      assessorStatus={objStatus ? {
                        id: objStatus.id,
                        status: objStatus.status,
                        assessmentNotes: objStatus.assessmentNotes,
                        evidenceDescription: objStatus.evidenceDescription,
                        officialAssessorId: objStatus.officialAssessorId ?? null,
                        officialAssessedAt: objStatus.officialAssessedAt ?? null,
                        version: objStatus.version || 0,
                        artifactsReviewed: objStatus.artifactsReviewed,
                        interviewees: objStatus.interviewees,
                        examineDescription: objStatus.examineDescription,
                        testDescription: objStatus.testDescription,
                        timeToAssessMinutes: objStatus.timeToAssessMinutes,
                        dependentESPId: objStatus.dependentESPId ?? null,
                        assessorQuestionsForOSC: objStatus.assessorQuestionsForOSC ?? null,
                      } : null}
                      requirementEvidence={control.evidence}
                      packageESPs={engagement.atoPackage?.externalServiceProviders || []}
                      locked={isPhase1Locked}
                      onSaved={() => router.refresh()}
                      engagementKind={engagementKind}
                      requirementId={control.requirement.requirementId}
                    />
                  )
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p>No assessment objectives defined for this control</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assessor Findings */}
          <Card className={assessmentModeActive ? 'border-amber-300 dark:border-amber-700' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-amber-600" />
                Assessor Findings
              </CardTitle>
              <CardDescription>
                {assessmentModeActive
                  ? 'Write your assessment findings — these will be visible to the customer'
                  : 'Official C3PAO assessment comments'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assessmentModeActive ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="assessor-notes">Assessment Findings & Recommendations</Label>
                    <Textarea
                      id="assessor-notes"
                      placeholder="Document your assessment findings, deficiencies, and recommendations for the customer..."
                      value={assessorNotes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      rows={5}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      These notes will appear prominently on the customer&apos;s control view
                    </p>
                  </div>
                  <Button
                    onClick={handleSaveNotes}
                    disabled={savingNotes || !notesChanged}
                    className="w-full"
                  >
                    {savingNotes ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {notesChanged ? 'Save Findings' : 'No Changes'}
                      </>
                    )}
                  </Button>
                </div>
              ) : control.assessmentNotes ? (
                <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-amber-900 dark:text-amber-100">
                    {control.assessmentNotes}
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed rounded-lg">
                  <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No assessor findings recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <Separator />
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href={`/engagements/${engagementId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All Controls
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {navigation.prevId && (
            <Button variant="outline" asChild>
              <Link href={`/engagements/${engagementId}/control/${navigation.prevId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous: {navigation.prevName}
              </Link>
            </Button>
          )}
          {navigation.nextId && (
            <Button asChild>
              <Link href={`/engagements/${engagementId}/control/${navigation.nextId}`}>
                Next: {navigation.nextName}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>

    </>
  )
}
