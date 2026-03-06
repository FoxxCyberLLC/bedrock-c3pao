'use client'

import { useState, useTransition } from 'react'
import { safeDate } from '@/lib/utils'
import {
  CheckCircle2,
  XCircle,
  Minus,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Save,
  Loader2,
  Clock,
  Building2,
  FileText,
  Users,
  FileSearch,
  TestTube,
  MessageCircleQuestion,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { assessorUpdateObjectiveStatus } from '@/app/actions/c3pao-dashboard'

type ObjectiveComplianceStatus = 'NOT_ASSESSED' | 'MET' | 'NOT_MET' | 'NOT_APPLICABLE'
type InheritedStatus = 'NONE' | 'PARTIAL' | 'FULL'

interface Evidence {
  id: string
  fileName: string
  description: string | null
}

interface ESP {
  id: string
  providerName: string
}

interface ObjectiveData {
  id: string
  objectiveReference: string
  description: string
  questionsForOSC: string | null
}

interface AssessorStatusData {
  id?: string
  status: ObjectiveComplianceStatus
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
  assessorQuestionsForOSC: string | null
}

interface ObjectiveAssessmentCardProps {
  engagementId: string
  objective: ObjectiveData
  assessorStatus: AssessorStatusData | null
  requirementEvidence: Evidence[]
  packageESPs: ESP[]
  onSaved?: () => void
}

const statusOptions = [
  { value: 'NOT_ASSESSED', label: 'Not Assessed', icon: Minus, color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
  { value: 'MET', label: 'Met', icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-500/10' },
  { value: 'NOT_MET', label: 'Not Met', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-500/10' },
  { value: 'NOT_APPLICABLE', label: 'N/A', icon: AlertCircle, color: 'text-gray-400', bgColor: 'bg-gray-400/10' },
]

const inheritedOptions = [
  { value: 'NONE', label: 'None' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'FULL', label: 'Full' },
]

export function ObjectiveAssessmentCard({
  engagementId,
  objective,
  assessorStatus,
  requirementEvidence,
  packageESPs,
  onSaved,
}: ObjectiveAssessmentCardProps) {
  const [isPending, startTransition] = useTransition()
  const [isExpanded, setIsExpanded] = useState(false)

  // Parse existing artifacts (JSON array of evidence IDs)
  const existingArtifacts = assessorStatus?.artifactsReviewed
    ? JSON.parse(assessorStatus.artifactsReviewed) as string[]
    : []

  // Form state — initialized from C3PAO assessor's previous assessment
  const [status, setStatus] = useState<ObjectiveComplianceStatus>(
    assessorStatus?.status || 'NOT_ASSESSED'
  )
  const [findings, setFindings] = useState(assessorStatus?.assessmentNotes || '')
  const [selectedArtifacts, setSelectedArtifacts] = useState<string[]>(existingArtifacts)
  const [interviewees, setInterviewees] = useState(assessorStatus?.interviewees || '')
  const [examineDescription, setExamineDescription] = useState(assessorStatus?.examineDescription || '')
  const [testDescription, setTestDescription] = useState(assessorStatus?.testDescription || '')
  const [timeToAssess, setTimeToAssess] = useState(assessorStatus?.timeToAssessMinutes?.toString() || '')
  const [inheritedStatus, setInheritedStatus] = useState<InheritedStatus | ''>(
    assessorStatus?.inheritedStatus || ''
  )
  const [dependentESPId, setDependentESPId] = useState(assessorStatus?.dependentESPId || '__none__')
  const [assessorQuestions, setAssessorQuestions] = useState(assessorStatus?.assessorQuestionsForOSC || '')

  const statusConfig = statusOptions.find(s => s.value === status)
  const StatusIcon = statusConfig?.icon || Minus

  const handleArtifactToggle = (evidenceId: string) => {
    setSelectedArtifacts(prev =>
      prev.includes(evidenceId)
        ? prev.filter(id => id !== evidenceId)
        : [...prev, evidenceId]
    )
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await assessorUpdateObjectiveStatus({
        engagementId,
        objectiveId: objective.id,
        status,
        assessmentNotes: findings || undefined,
        version: assessorStatus?.version ?? 0,
        // eMASS fields
        artifactsReviewed: selectedArtifacts.length > 0 ? JSON.stringify(selectedArtifacts) : undefined,
        interviewees: interviewees || undefined,
        examineDescription: examineDescription || undefined,
        testDescription: testDescription || undefined,
        timeToAssessMinutes: timeToAssess ? parseInt(timeToAssess, 10) : undefined,
        inheritedStatus: inheritedStatus || undefined,
        dependentESPId: dependentESPId && dependentESPId !== '__none__' ? dependentESPId : null,
        assessorQuestionsForOSC: assessorQuestions || undefined,
      })

      if (result.success) {
        toast.success('Objective assessment saved')
        onSaved?.()
      } else if ('conflict' in result && result.conflict) {
        toast.error(result.error || 'Conflict detected. Please refresh.')
      } else {
        toast.error(result.error || 'Failed to save assessment')
      }
    })
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={`border rounded-lg ${status === 'NOT_MET' ? 'border-red-500/30' : status === 'MET' ? 'border-green-500/30' : 'border-border'}`}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                {objective.objectiveReference}
              </code>
              <span className="text-sm text-muted-foreground line-clamp-1 max-w-md">
                {objective.description}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* C3PAO assessor status badge */}
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${statusConfig?.bgColor}`}>
                <StatusIcon className={`h-3.5 w-3.5 ${statusConfig?.color}`} />
                <span className={`text-xs font-medium ${statusConfig?.color}`}>
                  {statusConfig?.label}
                </span>
              </div>
              {assessorStatus?.officialAssessorId && (
                <Badge variant="outline" className="text-[10px] bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                  Official
                </Badge>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-4 border-t">
            {/* Objective Description */}
            <div className="bg-muted/50 p-3 rounded-lg text-sm mt-3">
              <div className="font-medium mb-1">Objective:</div>
              <p className="text-muted-foreground">{objective.description}</p>
            </div>

            {/* Questions to Ask OSC (if available) */}
            {objective.questionsForOSC && (
              <div className="bg-purple-500/5 p-3 rounded-lg text-sm border border-purple-500/20">
                <div className="font-medium mb-1 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <MessageCircleQuestion className="h-4 w-4" />
                  Questions to Ask OSC:
                </div>
                <p className="text-muted-foreground whitespace-pre-line">{objective.questionsForOSC}</p>
              </div>
            )}

            {/* Assessor's Interview Questions (private, editable) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <MessageCircleQuestion className="h-3.5 w-3.5" />
                My Questions for OSC Interview
              </Label>
              <Textarea
                placeholder="Write your own interview questions here (private — not visible to OSC)..."
                value={assessorQuestions}
                onChange={(e) => setAssessorQuestions(e.target.value)}
                rows={2}
              />
            </div>

            {/* Evidence Description (if available) */}
            {assessorStatus?.evidenceDescription && (
              <div className="bg-blue-500/5 p-3 rounded-lg text-sm">
                <div className="font-medium mb-1 text-blue-700 dark:text-blue-300">Evidence Description:</div>
                <p className="text-muted-foreground">{assessorStatus.evidenceDescription}</p>
              </div>
            )}

            {/* Score/Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Score</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ObjectiveComplianceStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className={`h-4 w-4 ${opt.color}`} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Time to Assess (minutes)
                </Label>
                <Input
                  type="number"
                  placeholder="30"
                  value={timeToAssess}
                  onChange={(e) => setTimeToAssess(e.target.value)}
                  min={1}
                />
              </div>
            </div>

            {/* Artifacts Reviewed */}
            {requirementEvidence.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  Artifacts Reviewed
                </Label>
                <div className="relative grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg bg-muted/30">
                  {requirementEvidence.map((evidence) => (
                    <div key={evidence.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`evidence-${evidence.id}`}
                        checked={selectedArtifacts.includes(evidence.id)}
                        onCheckedChange={() => handleArtifactToggle(evidence.id)}
                      />
                      <label
                        htmlFor={`evidence-${evidence.id}`}
                        className="text-xs cursor-pointer truncate"
                        title={evidence.description || evidence.fileName}
                      >
                        {evidence.fileName}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interviews */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Interviews
              </Label>
              <Input
                placeholder="John Smith; Jane Doe (semicolon-separated)"
                value={interviewees}
                onChange={(e) => setInterviewees(e.target.value)}
              />
            </div>

            {/* Examine Description */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <FileSearch className="h-3.5 w-3.5" />
                Examine Description
              </Label>
              <Textarea
                placeholder="Description of what was examined..."
                value={examineDescription}
                onChange={(e) => setExamineDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Test Description */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <TestTube className="h-3.5 w-3.5" />
                Test Description
              </Label>
              <Textarea
                placeholder="Description of what was tested..."
                value={testDescription}
                onChange={(e) => setTestDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Inherited Status and ESP Dependency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inherited Status</Label>
                <Select value={inheritedStatus} onValueChange={(v) => setInheritedStatus(v as InheritedStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inheritedOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {packageESPs.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Dependent ESP
                  </Label>
                  <Select value={dependentESPId} onValueChange={setDependentESPId}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {packageESPs.map((esp) => (
                        <SelectItem key={esp.id} value={esp.id}>
                          {esp.providerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Findings */}
            <div className="space-y-2">
              <Label>Findings</Label>
              <Textarea
                placeholder="Assessment findings for this objective..."
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                rows={3}
              />
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                {assessorStatus?.officialAssessedAt && safeDate(assessorStatus.officialAssessedAt) && (
                  <>Last assessed: {safeDate(assessorStatus.officialAssessedAt)!.toLocaleDateString()}</>
                )}
              </div>
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
