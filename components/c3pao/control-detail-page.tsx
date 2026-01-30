'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { updateAssessorNotes } from '@/app/actions/c3pao-dashboard'
import { toast } from 'sonner'
import { ObjectiveAssessmentCard } from './objective-assessment-card'

interface Evidence {
  id: string
  fileName: string
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
  officialAssessorId: string | null
  officialAssessedAt: Date | null
  version: number
  // eMASS fields
  artifactsReviewed: string | null
  interviewees: string | null
  examineDescription: string | null
  testDescription: string | null
  timeToAssessMinutes: number | null
  inheritedStatus: InheritedStatus | null
  dependentESPId: string | null
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
}

const statusConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
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

function getFileIcon(mimeType: string | null): React.ReactNode {
  if (!mimeType) return <FileText className="h-5 w-5" />
  if (mimeType.startsWith('image/')) return <FileText className="h-5 w-5 text-blue-500" />
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileText className="h-5 w-5 text-green-500" />
  if (mimeType.includes('document') || mimeType.includes('word')) return <FileText className="h-5 w-5 text-blue-600" />
  return <FileText className="h-5 w-5" />
}

export function ControlDetailPage({
  engagementId,
  engagement,
  control,
  navigation,
}: ControlDetailPageProps) {
  const router = useRouter()
  const [assessorNotes, setAssessorNotes] = useState(control.assessmentNotes || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesChanged, setNotesChanged] = useState(false)

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

  const status = statusConfig[control.status] || statusConfig.NOT_STARTED
  const StatusIcon = status.icon
  const objectives = control.requirement.objectives || []
  const assessmentModeActive = engagement.assessmentModeActive

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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

          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${status.bgColor}`}>
            <StatusIcon className={`h-5 w-5 ${status.color}`} />
            <span className={`text-lg font-semibold ${status.color}`}>{status.label}</span>
          </div>
        </div>

        {/* Assessment Mode Banner */}
        {assessmentModeActive && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-medium text-amber-800 dark:text-amber-200">Assessment Mode Active</span>
              <span className="text-amber-700 dark:text-amber-300 ml-2">
                - You can update objective statuses as official C3PAO assessments
              </span>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Requirement Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Requirement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScrollText className="h-5 w-5" />
                Basic Security Requirement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {control.requirement.basicRequirement}
              </p>
            </CardContent>
          </Card>

          {/* Derived Requirement */}
          {control.requirement.derivedRequirement && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Derived Security Requirement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {control.requirement.derivedRequirement}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Discussion */}
          {control.requirement.discussion && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Discussion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {control.requirement.discussion}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Assessment Objectives */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Assessment Objectives ({objectives.length})
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {objectives.filter(obj => obj.statuses?.[0]?.status && obj.statuses[0].status !== 'NOT_ASSESSED').length}/{objectives.length} assessed
                </span>
              </CardTitle>
              <CardDescription>
                Per NIST SP 800-171A, each objective must be individually assessed. Use the forms below to capture all eMASS-required data.
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
                      customerStatus={objStatus ? {
                        id: objStatus.id,
                        status: objStatus.status,
                        assessmentNotes: objStatus.assessmentNotes,
                        evidenceDescription: objStatus.evidenceDescription,
                        officialAssessorId: objStatus.officialAssessorId,
                        officialAssessedAt: objStatus.officialAssessedAt,
                        version: objStatus.version || 0,
                        artifactsReviewed: objStatus.artifactsReviewed,
                        interviewees: objStatus.interviewees,
                        examineDescription: objStatus.examineDescription,
                        testDescription: objStatus.testDescription,
                        timeToAssessMinutes: objStatus.timeToAssessMinutes,
                        inheritedStatus: objStatus.inheritedStatus,
                        dependentESPId: objStatus.dependentESPId,
                      } : null}
                      requirementEvidence={control.evidence}
                      packageESPs={engagement.atoPackage?.externalServiceProviders || []}
                      onSaved={() => router.refresh()}
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
        </div>

        {/* Right Column - Status & Evidence */}
        <div className="space-y-6">
          {/* Implementation Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <StickyNote className="h-5 w-5" />
                Implementation Notes
              </CardTitle>
              <CardDescription>
                How the organization implements this control
              </CardDescription>
            </CardHeader>
            <CardContent>
              {control.implementationNotes ? (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {control.implementationNotes}
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed rounded-lg">
                  <StickyNote className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No implementation notes provided
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assessor Notes - Editable for C3PAO */}
          <Card className={assessmentModeActive ? 'border-amber-300 dark:border-amber-700' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-amber-600" />
                Assessor Findings
              </CardTitle>
              <CardDescription>
                {assessmentModeActive
                  ? 'Write your assessment findings - these will be visible to the customer'
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
                  <p className="mt-2 text-sm text-muted-foreground">
                    No assessor findings recorded yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evidence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Evidence ({control.evidence.length})
              </CardTitle>
              <CardDescription>
                Supporting documentation for this control
              </CardDescription>
            </CardHeader>
            <CardContent>
              {control.evidence.length > 0 ? (
                <div className="space-y-3">
                  {control.evidence.map((ev) => (
                    <div key={ev.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start gap-3">
                        {getFileIcon(ev.mimeType)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{ev.fileName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatFileSize(ev.fileSize)} • {format(new Date(ev.createdAt), 'MMM d, yyyy')}
                          </div>
                          {ev.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed rounded-lg">
                  <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No evidence linked to this control
                  </p>
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
  )
}
