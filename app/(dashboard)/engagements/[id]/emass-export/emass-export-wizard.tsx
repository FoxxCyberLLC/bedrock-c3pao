'use client'

import { useState } from 'react'
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
import type { EMASSWizardData } from '@/app/actions/cmmc-export'

interface EMASSExportWizardProps {
  data: EMASSWizardData
  user: {
    id: string
    name: string
  }
}

type WizardStep = 'assessment' | 'requirements' | 'objectives' | 'ssp' | 'review'

const STEPS: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'assessment', label: 'Assessment', icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'requirements', label: 'Requirements', icon: <Shield className="h-4 w-4" /> },
  { id: 'objectives', label: 'Objectives', icon: <Target className="h-4 w-4" /> },
  { id: 'ssp', label: 'SSP', icon: <FileText className="h-4 w-4" /> },
  { id: 'review', label: 'Review & Export', icon: <FileSpreadsheet className="h-4 w-4" /> },
]

export function EMASSExportWizard({ data, user }: EMASSExportWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<WizardStep>('assessment')
  const [isExporting, setIsExporting] = useState(false)

  // Form state for editable fields
  const [formData, setFormData] = useState({
    executiveSummary: data.assessment.executiveSummary || '',
    standardsAcceptance: data.assessment.standardsAcceptance || '',
    hashValue: data.assessment.hashValue || '',
    hashedDataList: data.assessment.hashedDataList || '',
  })

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

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Trigger the download
      const response = await fetch(`/api/engagements/${data.engagementId}/export`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'cmmc_export.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
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

      {/* Validation Alerts */}
      {data.validation.errors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Required Fields Missing</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2">
              {data.validation.errors.map((error: string, i: number) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {data.validation.warnings.length > 0 && currentStep === 'review' && (
        <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-200">Warnings</AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            <ul className="list-disc list-inside mt-2">
              {data.validation.warnings.map((warning: string, i: number) => (
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
                    <Label className="text-muted-foreground">
                      Assessment Start Date <Badge variant="destructive" className="ml-2">Required</Badge>
                    </Label>
                    <div className="mt-1 p-2 bg-muted rounded-md flex items-center gap-2">
                      {data.assessment.assessmentStartDate ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          {formatDate(data.assessment.assessmentStartDate)}
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-destructive">Not set</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">
                      Assessment End Date <Badge variant="destructive" className="ml-2">Required</Badge>
                    </Label>
                    <div className="mt-1 p-2 bg-muted rounded-md flex items-center gap-2">
                      {data.assessment.assessmentEndDate ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          {formatDate(data.assessment.assessmentEndDate)}
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-yellow-600">Set when assessment is completed</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">
                      Lead Assessor CPN <Badge variant="destructive" className="ml-2">Required</Badge>
                    </Label>
                    <div className="mt-1 p-2 bg-muted rounded-md flex items-center gap-2">
                      {data.assessment.leadAssessorCPN ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          {data.assessment.leadAssessorCPN}
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-destructive">Not set</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">
                      QA Assessor CPN <Badge variant="destructive" className="ml-2">Required</Badge>
                    </Label>
                    <div className="mt-1 p-2 bg-muted rounded-md flex items-center gap-2">
                      {data.assessment.qaAssessorCPN ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          {data.assessment.qaAssessorCPN}
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-yellow-600">Not set (recommended)</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Help text for missing system fields */}
                  {(!data.assessment.assessmentStartDate || !data.assessment.assessmentEndDate || !data.assessment.leadAssessorCPN) && (
                    <Alert className="mt-4">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Missing fields above must be set in the{' '}
                        <Link
                          href={`/engagements/${data.engagementId}`}
                          className="underline font-medium"
                        >
                          engagement settings
                        </Link>
                        {' '}before export.
                      </AlertDescription>
                    </Alert>
                  )}
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
                  variant={data.validation.isValid ? 'default' : 'destructive'}
                  className={data.validation.isValid ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}
                >
                  {data.validation.isValid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {data.validation.isValid ? 'Ready to Export' : 'Cannot Export'}
                  </AlertTitle>
                  <AlertDescription>
                    {data.validation.isValid
                      ? 'All required fields are complete. Your workbook is ready for download.'
                      : 'Please address the required fields before exporting.'}
                  </AlertDescription>
                </Alert>

                <div className="flex justify-center pt-4">
                  <Button
                    size="lg"
                    onClick={handleExport}
                    disabled={!data.validation.isValid || isExporting}
                    className="gap-2"
                  >
                    <Download className="h-5 w-5" />
                    {isExporting ? 'Generating...' : 'Download eMASS Workbook'}
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
