'use client'

import { useState, useTransition } from 'react'
import {
  CheckCircle2,
  XCircle,
  Minus,
  AlertCircle,
  Users,
  FileSearch,
  TestTube,
  ChevronDown,
  ChevronRight,
  Save,
  Loader2,
  AlertTriangle,
  Shield,
} from 'lucide-react'
import { getRequirementValue, getRequirementCriticality, isPoamAllowed, getCmmcDisplayId } from '@/lib/cmmc/requirement-values'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import { toast } from 'sonner'
import { saveAssessmentFinding } from '@/app/actions/c3pao-assessment'

type AssessorDetermination = 'NOT_ASSESSED' | 'MET' | 'NOT_MET' | 'NOT_APPLICABLE'
type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'

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

interface CustomerStatus {
  id: string
  status: string
  implementationNotes: string | null
}

interface AssessmentFindingData {
  id?: string
  determination: AssessorDetermination
  methodInterview: boolean
  methodExamine: boolean
  methodTest: boolean
  finding: string | null
  objectiveEvidence: string | null
  deficiency: string | null
  recommendation: string | null
  riskLevel: RiskLevel | null
  assessedById?: string | null
  assessedAt?: string | Date | null
  version?: number
}

interface AssessorControlCardProps {
  engagementId: string
  requirement: Requirement
  customerStatus: CustomerStatus | null
  existingFinding: AssessmentFindingData | null
  onFindingSaved?: (finding: AssessmentFindingData) => void
}

const determinationOptions = [
  { value: 'NOT_ASSESSED', label: 'Not Assessed', icon: Minus, color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
  { value: 'MET', label: 'Met', icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-500/10' },
  { value: 'NOT_MET', label: 'Not Met', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-500/10' },
  { value: 'NOT_APPLICABLE', label: 'N/A', icon: AlertCircle, color: 'text-gray-400', bgColor: 'bg-gray-400/10' },
]

const riskLevelOptions = [
  { value: 'CRITICAL', label: 'Critical', color: 'text-red-700 bg-red-500/20' },
  { value: 'HIGH', label: 'High', color: 'text-orange-700 bg-orange-500/20' },
  { value: 'MODERATE', label: 'Moderate', color: 'text-yellow-700 bg-yellow-500/20' },
  { value: 'LOW', label: 'Low', color: 'text-blue-700 bg-blue-500/20' },
]

const customerStatusMap: Record<string, { label: string; color: string }> = {
  COMPLIANT: { label: 'Self-Assessed: Compliant', color: 'bg-green-500/10 text-green-600' },
  NON_COMPLIANT: { label: 'Self-Assessed: Non-Compliant', color: 'bg-red-500/10 text-red-600' },
  IN_PROGRESS: { label: 'Self-Assessed: In Progress', color: 'bg-blue-500/10 text-blue-600' },
  NOT_STARTED: { label: 'Self-Assessed: Not Started', color: 'bg-gray-500/10 text-gray-600' },
  NOT_APPLICABLE: { label: 'Self-Assessed: N/A', color: 'bg-gray-400/10 text-gray-500' },
}

export function AssessorControlCard({
  engagementId,
  requirement,
  customerStatus,
  existingFinding,
  onFindingSaved,
}: AssessorControlCardProps) {
  const [isPending, startTransition] = useTransition()
  const [isExpanded, setIsExpanded] = useState(false)

  // Form state
  const [determination, setDetermination] = useState<AssessorDetermination>(
    existingFinding?.determination || 'NOT_ASSESSED'
  )
  const [methodInterview, setMethodInterview] = useState(existingFinding?.methodInterview || false)
  const [methodExamine, setMethodExamine] = useState(existingFinding?.methodExamine || false)
  const [methodTest, setMethodTest] = useState(existingFinding?.methodTest || false)
  const [finding, setFinding] = useState(existingFinding?.finding || '')
  const [objectiveEvidence, setObjectiveEvidence] = useState(existingFinding?.objectiveEvidence || '')
  const [deficiency, setDeficiency] = useState(existingFinding?.deficiency || '')
  const [recommendation, setRecommendation] = useState(existingFinding?.recommendation || '')
  const [riskLevel, setRiskLevel] = useState<RiskLevel | ''>(existingFinding?.riskLevel || '')

  const determinationConfig = determinationOptions.find(d => d.value === determination)
  const DeterminationIcon = determinationConfig?.icon || Minus

  // Get point value info
  const reqValue = getRequirementValue(requirement.requirementId)
  const criticality = getRequirementCriticality(requirement.requirementId)
  const canPoam = isPoamAllowed(requirement.requirementId)

  const getPointsBadge = () => {
    if (reqValue.displayValue === 'N/A') {
      return (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800" title="N/A - Must be Met for certification">
          <span className="text-xs font-medium text-gray-500">N/A</span>
        </div>
      )
    }

    const styles = {
      critical: { bg: 'bg-red-100 dark:bg-red-950/50', text: 'text-red-700 dark:text-red-400', icon: AlertTriangle },
      important: { bg: 'bg-amber-100 dark:bg-amber-950/50', text: 'text-amber-700 dark:text-amber-400', icon: Shield },
      standard: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', icon: null }
    }
    const style = styles[criticality]
    const Icon = style.icon

    return (
      <div
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${style.bg}`}
        title={`${reqValue.value} points - ${criticality === 'critical' ? 'Critical (No POA&M)' : criticality === 'important' ? 'Important' : 'Standard'}`}
      >
        {Icon && <Icon className={`h-3 w-3 ${style.text}`} />}
        <span className={`text-xs font-bold ${style.text}`}>{reqValue.displayValue}</span>
        <span className={`text-[10px] ${style.text}`}>pts</span>
      </div>
    )
  }

  const handleSave = () => {
    if (determination === 'NOT_MET' && !riskLevel) {
      toast.error('Please select a risk level for NOT MET findings')
      return
    }

    if (!methodInterview && !methodExamine && !methodTest) {
      toast.error('Please select at least one assessment method')
      return
    }

    startTransition(async () => {
      const result = await saveAssessmentFinding({
        engagementId,
        requirementId: requirement.requirementId,
        findingId: existingFinding?.id,
        determination,
        methodInterview,
        methodExamine,
        methodTest,
        finding: finding || undefined,
        objectiveEvidence: objectiveEvidence || undefined,
        deficiency: determination === 'NOT_MET' ? deficiency || undefined : undefined,
        recommendation: determination === 'NOT_MET' ? recommendation || undefined : undefined,
        riskLevel: determination === 'NOT_MET' && riskLevel ? riskLevel as RiskLevel : undefined,
      })

      if (result.success) {
        toast.success('Finding saved')
        onFindingSaved?.(result.data as AssessmentFindingData)
      } else {
        toast.error(result.error || 'Failed to save finding')
      }
    })
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={determination === 'NOT_MET' ? 'border-red-500/30' : determination === 'MET' ? 'border-green-500/30' : ''}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                  {getCmmcDisplayId(requirement.requirementId, requirement.family.code)}
                </code>
                {getPointsBadge()}
                <CardTitle className="text-sm font-medium">{requirement.title}</CardTitle>
              </div>

              <div className="flex items-center gap-3">
                {/* Customer's self-assessment status */}
                {customerStatus && (
                  <Badge className={`text-xs ${customerStatusMap[customerStatus.status]?.color || 'bg-gray-500/10'}`}>
                    {customerStatusMap[customerStatus.status]?.label || customerStatus.status}
                  </Badge>
                )}

                {/* Assessor's determination */}
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${determinationConfig?.bgColor}`}>
                  <DeterminationIcon className={`h-4 w-4 ${determinationConfig?.color}`} />
                  <span className={`text-xs font-medium ${determinationConfig?.color}`}>
                    {determinationConfig?.label}
                  </span>
                </div>

                {/* Assessment methods indicators */}
                <div className="flex items-center gap-1">
                  {methodInterview && <span title="Interview"><Users className="h-3.5 w-3.5 text-blue-500" /></span>}
                  {methodExamine && <span title="Examine"><FileSearch className="h-3.5 w-3.5 text-purple-500" /></span>}
                  {methodTest && <span title="Test"><TestTube className="h-3.5 w-3.5 text-orange-500" /></span>}
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Requirement Text */}
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <div className="font-medium mb-1">Basic Requirement:</div>
              <p className="text-muted-foreground">{requirement.basicRequirement}</p>
            </div>

            {/* Customer's Implementation Notes */}
            {customerStatus?.implementationNotes && (
              <div className="bg-blue-500/5 p-3 rounded-lg text-sm">
                <div className="font-medium mb-1 text-blue-700">Customer Implementation Notes:</div>
                <p className="text-muted-foreground">{customerStatus.implementationNotes}</p>
              </div>
            )}

            {/* Assessment Methods */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assessment Methods Used</Label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`interview-${requirement.id}`}
                    checked={methodInterview}
                    onCheckedChange={(checked) => setMethodInterview(!!checked)}
                  />
                  <label htmlFor={`interview-${requirement.id}`} className="text-sm flex items-center gap-1">
                    <Users className="h-4 w-4 text-blue-500" />
                    Interview
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`examine-${requirement.id}`}
                    checked={methodExamine}
                    onCheckedChange={(checked) => setMethodExamine(!!checked)}
                  />
                  <label htmlFor={`examine-${requirement.id}`} className="text-sm flex items-center gap-1">
                    <FileSearch className="h-4 w-4 text-purple-500" />
                    Examine
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`test-${requirement.id}`}
                    checked={methodTest}
                    onCheckedChange={(checked) => setMethodTest(!!checked)}
                  />
                  <label htmlFor={`test-${requirement.id}`} className="text-sm flex items-center gap-1">
                    <TestTube className="h-4 w-4 text-orange-500" />
                    Test
                  </label>
                </div>
              </div>
            </div>

            {/* Assessor Determination */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assessor Determination</Label>
                <Select value={determination} onValueChange={(v) => setDetermination(v as AssessorDetermination)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {determinationOptions.map((opt) => (
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

              {determination === 'NOT_MET' && (
                <div className="space-y-2">
                  <Label>Risk Level</Label>
                  <Select value={riskLevel} onValueChange={(v) => setRiskLevel(v as RiskLevel)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk level" />
                    </SelectTrigger>
                    <SelectContent>
                      {riskLevelOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <Badge className={opt.color}>{opt.label}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Objective Evidence */}
            <div className="space-y-2">
              <Label>Objective Evidence Observed</Label>
              <Textarea
                placeholder="Describe what you observed during assessment..."
                value={objectiveEvidence}
                onChange={(e) => setObjectiveEvidence(e.target.value)}
                rows={3}
              />
            </div>

            {/* Finding Notes */}
            <div className="space-y-2">
              <Label>Finding Notes</Label>
              <Textarea
                placeholder="General assessment notes..."
                value={finding}
                onChange={(e) => setFinding(e.target.value)}
                rows={2}
              />
            </div>

            {/* NOT MET specific fields */}
            {determination === 'NOT_MET' && (
              <>
                {/* POA&M Eligibility Warning */}
                {!canPoam && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-red-800 dark:text-red-200">Critical {reqValue.value}-Point Control - POA&M Not Allowed</p>
                      <p className="text-red-700 dark:text-red-300 mt-1">
                        This control cannot be placed in a POA&M. The OSC must fully implement this control to achieve CMMC certification.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-red-600">Deficiency Description</Label>
                  <Textarea
                    placeholder="Describe the specific deficiency or gap..."
                    value={deficiency}
                    onChange={(e) => setDeficiency(e.target.value)}
                    rows={3}
                    className="border-red-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recommendation for Remediation</Label>
                  <Textarea
                    placeholder="What should the organization do to address this finding..."
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                {existingFinding?.assessedAt && (
                  <>
                    Last assessed on{' '}
                    {new Date(existingFinding.assessedAt).toLocaleDateString()}
                  </>
                )}
              </div>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Finding
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
