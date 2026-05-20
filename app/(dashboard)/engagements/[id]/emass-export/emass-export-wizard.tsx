'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Download,
  ClipboardList,
  Target,
  Shield,
  FileText,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import type { EMASSWizardData } from '@/app/actions/cmmc-export'
import type { AssessmentSnapshotView } from '@/lib/api-client'

interface EMASSExportWizardProps {
  data: EMASSWizardData
  user: {
    id: string
    name: string
  }
  /** All snapshots for the engagement (chronologically). Empty when none exist. */
  snapshots?: AssessmentSnapshotView[]
  /** The snapshot driving the current export data. Defaults to the current snapshot. */
  selectedSnapshotId?: string
}

type WizardStep = 'assessment' | 'requirements' | 'objectives' | 'ssp' | 'review'

const STEPS: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'assessment', label: 'Assessment', icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'requirements', label: 'Requirements', icon: <Shield className="h-4 w-4" /> },
  { id: 'objectives', label: 'Objectives', icon: <Target className="h-4 w-4" /> },
  { id: 'ssp', label: 'SSP', icon: <FileText className="h-4 w-4" /> },
  { id: 'review', label: 'Review & Export', icon: <FileSpreadsheet className="h-4 w-4" /> },
]

const determinationLabel: Record<AssessmentSnapshotView['determination'], string> = {
  FINAL_LEVEL_2: 'Passed',
  CONDITIONAL_LEVEL_2: 'Conditional',
  NO_CMMC_STATUS: 'Not Met',
}

/** Convert an ISO-ish string to the YYYY-MM-DD shape an `<input type="date">` expects. */
function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ''
  // Accept both "2026-05-20" and full ISO timestamps.
  const slice = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : ''
}

export function EMASSExportWizard({
  data,
  user,
  snapshots = [],
  selectedSnapshotId,
}: EMASSExportWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<WizardStep>('assessment')
  const [isExportingXlsx, setIsExportingXlsx] = useState(false)
  const [isExportingJson, setIsExportingJson] = useState(false)

  // Snapshot picker is only shown when the engagement has 2+ snapshots.
  // Single-snapshot and no-snapshot cases default to auto-selected + hidden.
  const showSnapshotPicker = snapshots.length >= 2
  const sortedSnapshots = [...snapshots].sort((a, b) => b.version - a.version)
  const selectedSnapshot = sortedSnapshots.find((s) => s.id === selectedSnapshotId) ?? null

  const handleSnapshotChange = (value: string) => {
    const sp = new URLSearchParams()
    sp.set('snapshot', value)
    // Re-fetch via server component by navigating to the new query string.
    // Next.js `router.push` + search-param change re-runs the page.tsx loader
    // so getEMASSExportData re-runs with the new snapshotId.
    router.push(`?${sp.toString()}`)
  }

  // Form state for editable fields. The first four are wizard-only and were
  // already user-editable; the last four were rendered read-only as
  // "From System" but are now editable in-wizard so a missing or stale value
  // doesn't dead-end a COMPLETED engagement. Edits live in the wizard session
  // only — they override the system value for THIS export, but do not
  // persist back to the engagement record.
  const [formData, setFormData] = useState({
    executiveSummary: data.assessment.executiveSummary || '',
    standardsAcceptance: data.assessment.standardsAcceptance || '',
    hashValue: data.assessment.hashValue || '',
    hashedDataList: data.assessment.hashedDataList || '',
    assessmentStartDate: toDateInputValue(data.assessment.assessmentStartDate),
    assessmentEndDate: toDateInputValue(data.assessment.assessmentEndDate),
    leadAssessorCPN: data.assessment.leadAssessorCPN || '',
    qaAssessorCPN: data.assessment.qaAssessorCPN || '',
  })

  // Live, client-side validation that uses the user's overrides instead of
  // the server-computed snapshot. Drives the export button + alerts so the
  // wizard reflects what the user has just typed.
  const liveValidation = useMemo(() => {
    const errors: string[] = []
    const warnings: string[] = []
    if (!formData.assessmentStartDate) {
      errors.push('Assessment start date is required.')
    }
    if (!formData.leadAssessorCPN.trim()) {
      errors.push('Lead assessor CPN is required.')
    }
    if (!formData.hashValue.trim()) {
      errors.push('Hash value is required.')
    }
    if (!formData.hashedDataList.trim()) {
      errors.push('Hashed data list filename is required.')
    }
    if (!formData.executiveSummary.trim()) {
      errors.push('C3PAO Executive Summary is required.')
    }
    if (!formData.assessmentEndDate) {
      warnings.push('Assessment end date is not set — recommended before submission.')
    }
    if (!formData.qaAssessorCPN.trim()) {
      warnings.push('QA assessor CPN not set — recommended before submission.')
    }
    return { errors, warnings, isValid: errors.length === 0 }
  }, [formData])

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep)
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100

  const goToNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id)
    }
  }

  const goToPrev = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id)
    }
  }

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    a.remove()
  }

  const handleExportXlsx = async () => {
    setIsExportingXlsx(true)
    try {
      const { buildEMASSWorkbook } = await import('@/lib/emass-workbook')
      const buffer = await buildEMASSWorkbook({
        controls: data.rawData.controls,
        objectives: data.rawData.objectives,
        // Apply the wizard's date overrides at the export-data level so the
        // workbook sheet uses what the user typed, not the locked engagement value.
        exportData: {
          ...data.rawData.exportData,
          assessmentStartDate: formData.assessmentStartDate || data.rawData.exportData.assessmentStartDate,
          assessmentEndDate: formData.assessmentEndDate || data.rawData.exportData.assessmentEndDate,
        },
        team: data.rawData.team,
        ssp: data.ssp,
        wizardFields: formData,
      })
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const safeOrg = (data.assessment.oscName || 'export').replace(/[^a-zA-Z0-9-_ ]/g, '')
      triggerDownload(blob, `CMMC_L2_Assessment_${safeOrg}.xlsx`)
      toast.success('Excel workbook downloaded')
    } catch (error) {
      console.error('XLSX export failed:', error)
      toast.error('Failed to generate Excel workbook.')
    } finally {
      setIsExportingXlsx(false)
    }
  }

  const handleExportJson = async () => {
    setIsExportingJson(true)
    try {
      const enriched = {
        ...data.rawData.exportData,
        // Apply wizard overrides for the system-derived fields so the JSON
        // payload matches what the user sees in the wizard.
        assessmentStartDate: formData.assessmentStartDate || data.rawData.exportData.assessmentStartDate,
        assessmentEndDate: formData.assessmentEndDate || data.rawData.exportData.assessmentEndDate,
        wizardFields: formData,
        controls: [...data.rawData.controls].sort((a, b) => a.sortOrder - b.sortOrder),
        objectives: data.rawData.objectives,
        ssp: data.ssp,
      }
      const json = JSON.stringify(enriched, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const safeId = data.engagementId.replace(/[^a-zA-Z0-9-]/g, '')
      triggerDownload(blob, `CMMC_Assessment_Export_${safeId}.json`)
      toast.success('JSON export downloaded')
    } catch (error) {
      console.error('JSON export failed:', error)
      toast.error('Failed to generate JSON export.')
    } finally {
      setIsExportingJson(false)
    }
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Not set'
    return format(new Date(date), 'dd-MMM-yyyy')
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/engagements/${data.engagementId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Engagement
        </Link>
        <h1 className="text-2xl font-bold">eMASS Export Wizard</h1>
        <p className="text-muted-foreground">
          CMMC Level 2 Assessment Results Template v3.8
        </p>
      </div>

      {/* Snapshot picker — only when the engagement has multiple snapshots.
          Single-snapshot exports skip this step (no meaningful choice). */}
      {showSnapshotPicker && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" />
              Export Snapshot
            </CardTitle>
            <CardDescription>
              Choose which assessment snapshot to export. Defaults to the current snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Select
                value={selectedSnapshotId ?? ''}
                onValueChange={handleSnapshotChange}
              >
                <SelectTrigger className="w-full sm:max-w-xs">
                  <SelectValue placeholder="Select a snapshot" />
                </SelectTrigger>
                <SelectContent>
                  {sortedSnapshots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      v{s.version} · {determinationLabel[s.determination]}
                      {s.isCurrent ? ' · Current' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSnapshot && (
                <div className="text-xs text-muted-foreground">
                  Captured{' '}
                  {format(new Date(selectedSnapshot.capturedAt), 'PPp')}
                  {selectedSnapshot.capturedByName
                    ? ` by ${selectedSnapshot.capturedByName}`
                    : ''}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                index <= currentStepIndex
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  index < currentStepIndex
                    ? 'bg-primary border-primary text-primary-foreground'
                    : index === currentStepIndex
                    ? 'border-primary text-primary'
                    : 'border-muted-foreground'
                }`}
              >
                {index < currentStepIndex ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.icon
                )}
              </div>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Validation Alerts (driven by liveValidation so wizard edits clear them in real time) */}
      {liveValidation.errors.length > 0 && (
        <Alert variant="destructive" className="mb-4" data-testid="export-validation-errors">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Required Fields Missing</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2">
              {liveValidation.errors.map((error: string, i: number) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {liveValidation.warnings.length > 0 && currentStep === 'review' && (
        <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-200">Warnings</AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            <ul className="list-disc list-inside mt-2">
              {liveValidation.warnings.map((warning: string, i: number) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      <Card className="mb-6">
        {currentStep === 'assessment' && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Sheet 1: Assessment Results Information
              </CardTitle>
              <CardDescription>
                Review and complete the assessment metadata required for eMASS submission
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Read-only fields */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    From System
                  </h3>

                  <div>
                    <Label className="text-muted-foreground">OSC Name</Label>
                    <div className="mt-1 p-2 bg-muted rounded-md">
                      {data.assessment.oscName || 'Not set'}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="assessmentStartDate">
                      Assessment Start Date <Badge variant="destructive" className="ml-2">Required</Badge>
                    </Label>
                    <Input
                      id="assessmentStartDate"
                      type="date"
                      className="mt-1"
                      value={formData.assessmentStartDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, assessmentStartDate: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Defaults to the system value. Override here if it&apos;s
                      missing or wrong — the override applies to this export only.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="assessmentEndDate">Assessment End Date</Label>
                    <Input
                      id="assessmentEndDate"
                      type="date"
                      className="mt-1"
                      value={formData.assessmentEndDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, assessmentEndDate: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Set by the system on completion. Edit here to correct.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="leadAssessorCPN">
                      Lead Assessor CPN <Badge variant="destructive" className="ml-2">Required</Badge>
                    </Label>
                    <Input
                      id="leadAssessorCPN"
                      className="mt-1"
                      placeholder="e.g., CP-1234"
                      value={formData.leadAssessorCPN}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, leadAssessorCPN: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Pulled from the lead assessor&apos;s job title. Override if
                      it&apos;s missing or you want a different CPN on this export.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="qaAssessorCPN">QA Assessor CPN</Label>
                    <Input
                      id="qaAssessorCPN"
                      className="mt-1"
                      placeholder="e.g., CP-5678"
                      value={formData.qaAssessorCPN}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, qaAssessorCPN: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">Recommended, not required.</p>
                  </div>
                </div>

                {/* Editable fields */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Provide for Export
                  </h3>

                  <div>
                    <Label htmlFor="standardsAcceptance">Standards Acceptance</Label>
                    <Select
                      value={formData.standardsAcceptance || undefined}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, standardsAcceptance: value === 'none' ? '' : value }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select if applicable" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="DIBCAC High">DIBCAC High</SelectItem>
                        <SelectItem value="FedRAMP Moderate">FedRAMP Moderate</SelectItem>
                        <SelectItem value="FedRAMP High">FedRAMP High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="hashValue">
                      Hash Value <Badge variant="destructive" className="ml-2">Required</Badge>
                    </Label>
                    <Input
                      id="hashValue"
                      className="mt-1 font-mono text-sm"
                      placeholder="SHA-256 hash of artifacts folder"
                      value={formData.hashValue}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, hashValue: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Generate using: sha256sum on your artifacts folder
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="hashedDataList">
                      Hashed Data List (log filename) <Badge variant="destructive" className="ml-2">Required</Badge>
                    </Label>
                    <Input
                      id="hashedDataList"
                      className="mt-1"
                      placeholder="e.g., CMMC_Assessment_Artifacts.log"
                      value={formData.hashedDataList}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, hashedDataList: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Hash Algorithm</Label>
                    <div className="mt-1 p-2 bg-muted rounded-md">SHA-256</div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Hash Date</Label>
                    <div className="mt-1 p-2 bg-muted rounded-md">
                      {formatDate(new Date())}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="executiveSummary">
                  C3PAO Executive Summary <Badge variant="destructive" className="ml-2">Required</Badge>
                </Label>
                <Textarea
                  id="executiveSummary"
                  className="mt-1 min-h-[150px]"
                  placeholder="Provide a summary of the assessment findings, overall security posture, and recommendations..."
                  value={formData.executiveSummary}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, executiveSummary: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </>
        )}

        {currentStep === 'requirements' && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sheet 2: Requirements
              </CardTitle>
              <CardDescription>
                Review the 110 CMMC Level 2 requirements and their assessment status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{data.requirements.total}</div>
                    <div className="text-sm text-muted-foreground">Total Requirements</div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {data.requirements.met}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">Met</div>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50 dark:bg-red-950">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {data.requirements.notMet}
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-400">Not Met</div>
                  </CardContent>
                </Card>
                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                      {data.requirements.inPoam}
                    </div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-400">In POA&M</div>
                  </CardContent>
                </Card>
              </div>

              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Export Format</AlertTitle>
                <AlertDescription>
                  Requirements will be exported using CMMC standard format (e.g., AC.L2-3.1.1) with columns for:
                  Requirement Number, Description, Level, Requirement Value, POA&M Allowed, Requirement in POA&M, and Points to Subtract.
                </AlertDescription>
              </Alert>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Column</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Requirement Number</TableCell>
                    <TableCell>CMMC format identifier (e.g., AC.L2-3.1.1)</TableCell>
                    <TableCell><Badge variant="outline" className="text-green-600">Auto-populated</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Requirement Description</TableCell>
                    <TableCell>Full requirement text from NIST 800-171</TableCell>
                    <TableCell><Badge variant="outline" className="text-green-600">Auto-populated</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Level</TableCell>
                    <TableCell>CMMC maturity level</TableCell>
                    <TableCell><Badge variant="outline" className="text-green-600">Level 2</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Requirement Value</TableCell>
                    <TableCell>Point value (1, 3, or 5)</TableCell>
                    <TableCell><Badge variant="outline" className="text-green-600">Auto-populated</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">POA&M Allowed</TableCell>
                    <TableCell>Whether requirement can be in POA&M</TableCell>
                    <TableCell><Badge variant="outline" className="text-green-600">Auto-populated</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Requirement in POA&M</TableCell>
                    <TableCell>Current POA&M status for this requirement</TableCell>
                    <TableCell><Badge variant="outline" className="text-green-600">Auto-populated</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </>
        )}

        {currentStep === 'objectives' && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Sheet 3: Requirement Objectives
              </CardTitle>
              <CardDescription>
                Review the 320 assessment objectives and their detailed assessment data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{data.objectives.total}</div>
                    <div className="text-sm text-muted-foreground">Total Objectives</div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {data.objectives.assessed}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Assessed</div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {data.objectives.met}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">Met</div>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50 dark:bg-red-950">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {data.objectives.notMet}
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-400">Not Met</div>
                  </CardContent>
                </Card>
              </div>

              <h3 className="font-semibold mb-4">Assessment Evidence Completeness</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 border rounded-lg">
                  <div className="text-lg font-semibold">
                    {data.objectives.assessed - data.objectives.missingArtifacts}
                  </div>
                  <div className="text-sm text-muted-foreground">Have Artifacts</div>
                  {data.objectives.missingArtifacts > 0 && (
                    <Badge variant="outline" className="mt-2 text-yellow-600">
                      {data.objectives.missingArtifacts} missing
                    </Badge>
                  )}
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-lg font-semibold">
                    {data.objectives.assessed - data.objectives.missingInterviews}
                  </div>
                  <div className="text-sm text-muted-foreground">Have Interviews</div>
                  {data.objectives.missingInterviews > 0 && (
                    <Badge variant="outline" className="mt-2 text-yellow-600">
                      {data.objectives.missingInterviews} missing
                    </Badge>
                  )}
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-lg font-semibold">
                    {data.objectives.assessed - data.objectives.missingExamine}
                  </div>
                  <div className="text-sm text-muted-foreground">Have Examine Notes</div>
                  {data.objectives.missingExamine > 0 && (
                    <Badge variant="outline" className="mt-2 text-yellow-600">
                      {data.objectives.missingExamine} missing
                    </Badge>
                  )}
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-lg font-semibold">
                    {data.objectives.assessed - data.objectives.missingTest}
                  </div>
                  <div className="text-sm text-muted-foreground">Have Test Notes</div>
                  {data.objectives.missingTest > 0 && (
                    <Badge variant="outline" className="mt-2 text-yellow-600">
                      {data.objectives.missingTest} missing
                    </Badge>
                  )}
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Export Columns</AlertTitle>
                <AlertDescription>
                  Each objective will include: Requirement Number, Objective Number (e.g., AC.L2-3.1.1[a]),
                  Description, Artifacts, Interviews, Examine, Test, Overall Comments, Time to Assess,
                  Standards Acceptance, Inherited Status, ESP Name, Score, Date Assessed, Assessed By, and Findings.
                </AlertDescription>
              </Alert>
            </CardContent>
          </>
        )}

        {currentStep === 'ssp' && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sheet 4: OSC SSP(s)
              </CardTitle>
              <CardDescription>
                System Security Plan information that will be included in the export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SSP Name</TableHead>
                    <TableHead>SSP Version</TableHead>
                    <TableHead>SSP Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      {data.ssp.name || 'Not specified'}
                    </TableCell>
                    <TableCell>{data.ssp.version || '1.0'}</TableCell>
                    <TableCell>{formatDate(data.ssp.date)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Alert className="mt-6">
                <Info className="h-4 w-4" />
                <AlertTitle>SSP Information</AlertTitle>
                <AlertDescription>
                  The SSP details are pulled from the system configuration. If you need to update
                  this information, please do so in the package settings before exporting.
                </AlertDescription>
              </Alert>
            </CardContent>
          </>
        )}

        {currentStep === 'review' && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Review & Export
              </CardTitle>
              <CardDescription>
                Review your export and download the eMASS-ready workbook
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Export Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Organization:</span>
                        <span>{data.assessment.oscName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Assessment Period:</span>
                        <span>
                          {formatDate(data.assessment.assessmentStartDate)} - {formatDate(data.assessment.assessmentEndDate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lead Assessor:</span>
                        <span>{data.assessment.leadAssessorCPN || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Requirements:</span>
                        <span>{data.requirements.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Objectives Assessed:</span>
                        <span>{data.objectives.assessed} / {data.objectives.total}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Sheets Included</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>Assessment Results Information</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>Requirements ({data.requirements.total} rows)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>Requirement Objectives ({data.objectives.assessed} rows)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>OSC SSP(s)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>Example (Consolidated View)</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Alert
                  variant={liveValidation.isValid ? 'default' : 'destructive'}
                  className={liveValidation.isValid ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}
                >
                  {liveValidation.isValid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {liveValidation.isValid ? 'Ready to Export' : 'Cannot Export'}
                  </AlertTitle>
                  <AlertDescription>
                    {liveValidation.isValid
                      ? 'All required fields are complete. Your workbook is ready for download.'
                      : 'Please address the required fields before exporting.'}
                  </AlertDescription>
                </Alert>

                <div className="flex justify-center gap-4 pt-4">
                  <Button
                    size="lg"
                    onClick={handleExportXlsx}
                    disabled={!liveValidation.isValid || isExportingXlsx || isExportingJson}
                    className="gap-2"
                  >
                    <FileSpreadsheet className="h-5 w-5" />
                    {isExportingXlsx ? 'Generating...' : 'Download Excel Workbook'}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleExportJson}
                    disabled={!liveValidation.isValid || isExportingXlsx || isExportingJson}
                    className="gap-2"
                  >
                    <Download className="h-5 w-5" />
                    {isExportingJson ? 'Generating...' : 'Download JSON'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={goToPrev}
          disabled={currentStepIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>

        {currentStep !== 'review' ? (
          <Button onClick={goToNext} className="gap-2">
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => router.push(`/engagements/${data.engagementId}`)}
          >
            Back to Engagement
          </Button>
        )}
      </div>
    </div>
  )
}
