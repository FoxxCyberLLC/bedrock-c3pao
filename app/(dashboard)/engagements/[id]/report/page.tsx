'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  FileText,
  Save,
  Loader2,
  CheckCircle2,
  Clock,
  Send,
  Download,
  Eye,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Target,
  Shield,
  ChevronRight,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Printer,
  FileSignature,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  saveAssessmentReport,
  getAssessmentReport,
  updateReportStatus,
  generateReportData,
} from '@/app/actions/c3pao-assessment'
import { getEngagementById } from '@/app/actions/c3pao-dashboard'
import { normalizeLegacyStatus, CMMCStatusConfig } from '@/lib/cmmc/status-determination'
import { DownloadCertificateButton } from '@/components/c3pao/certificates/download-certificate-button'

type ReportStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'DELIVERED'

interface ReportData {
  stats: { met: number; notMet: number; notApplicable: number; total: number }
  findingsByFamily: Record<string, {
    code: string
    name: string
    findings: Array<{
      id: string
      requirementId: string
      title: string
      determination: string
      finding: string | null
    }>
  }>
}

interface EngagementData {
  id: string
  status: string
  targetLevel: string
  assessmentResult: string | null
  actualStartDate: Date | null
  actualCompletionDate: Date | null
  atoPackage: {
    id: string
    name: string
    systemName?: string | null
    organization?: {
      id: string
      name: string
    } | null
  }
  leadAssessor: {
    id: string
    name: string
    email?: string | null
  } | null
}

const statusConfig: Record<ReportStatus, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
}> = {
  DRAFT: {
    label: 'Draft',
    icon: FileText,
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
  },
  IN_REVIEW: {
    label: 'In Review',
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  DELIVERED: {
    label: 'Delivered to Customer',
    icon: Send,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
}

const sections = [
  { id: 'executive', label: 'Executive Summary', required: true },
  { id: 'scope', label: 'Scope of Assessment', required: true },
  { id: 'methodology', label: 'Assessment Methodology', required: true },
  { id: 'findings', label: 'Findings Summary', required: true },
  { id: 'recommendations', label: 'Recommendations', required: false },
  { id: 'conclusion', label: 'Conclusion', required: true },
]

export default function AssessmentReportPage() {
  const router = useRouter()
  const params = useParams()
  const engagementId = params.id as string

  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [activeSection, setActiveSection] = useState('executive')

  // Engagement data
  const [engagement, setEngagement] = useState<EngagementData | null>(null)

  // Report state
  const [reportId, setReportId] = useState<string | null>(null)
  const [status, setStatus] = useState<ReportStatus>('DRAFT')
  const [executiveSummary, setExecutiveSummary] = useState('')
  const [scopeDescription, setScopeDescription] = useState('')
  const [methodology, setMethodology] = useState('')
  const [findingsSummary, setFindingsSummary] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Report metadata
  const [preparedBy, setPreparedBy] = useState<{ name: string } | null>(null)
  const [preparedAt, setPreparedAt] = useState<Date | null>(null)
  const [approvedBy, setApprovedBy] = useState<{ name: string } | null>(null)
  const [approvedAt, setApprovedAt] = useState<Date | null>(null)
  const [deliveredAt, setDeliveredAt] = useState<Date | null>(null)

  // Report data
  const [reportData, setReportData] = useState<ReportData | null>(null)

  // Load data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const [engagementResult, reportResult, dataResult] = await Promise.all([
          getEngagementById(engagementId),
          getAssessmentReport(engagementId),
          generateReportData(engagementId),
        ])

        if (engagementResult.success && engagementResult.data) {
          setEngagement(engagementResult.data as unknown as EngagementData)
        }

        if (reportResult.success && reportResult.data) {
          const report = reportResult.data
          setReportId(report.id)
          setStatus(report.status as ReportStatus)
          setExecutiveSummary(report.executiveSummary || '')
          setScopeDescription(report.scopeDescription || '')
          setMethodology(report.methodology || '')
          setFindingsSummary(report.findingsSummary || '')
          setRecommendations(report.recommendations || '')
          setConclusion(report.conclusion || '')
          setPreparedBy(report.preparedBy)
          setPreparedAt(report.preparedAt)
          setApprovedBy(report.approvedBy)
          setApprovedAt(report.approvedAt)
          setDeliveredAt(report.deliveredAt)
        }

        if (dataResult.success && dataResult.data) {
          setReportData(dataResult.data as unknown as ReportData)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        toast.error('Failed to load report data')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [engagementId])

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveAssessmentReport({
        engagementId,
        executiveSummary,
        scopeDescription,
        methodology,
        findingsSummary,
        recommendations,
        conclusion,
      })

      if (result.success && result.data) {
        toast.success('Report saved successfully')
        if (!reportId) {
          setReportId(result.data.id)
        }
        setPreparedAt(new Date())
        setHasUnsavedChanges(false)
      } else {
        toast.error(result.error || 'Failed to save report')
      }
    })
  }

  const handleStatusChange = (newStatus: ReportStatus) => {
    startTransition(async () => {
      const result = await updateReportStatus(engagementId, newStatus)
      if (result.success) {
        setStatus(newStatus)
        toast.success(`Report ${newStatus === 'DELIVERED' ? 'delivered to customer' : 'status updated'}`)
        if (newStatus === 'APPROVED') {
          setApprovedAt(new Date())
        }
        if (newStatus === 'DELIVERED') {
          setDeliveredAt(new Date())
        }
      } else {
        toast.error(result.error || 'Failed to update status')
      }
    })
  }

  const getSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'executive': return executiveSummary
      case 'scope': return scopeDescription
      case 'methodology': return methodology
      case 'findings': return findingsSummary
      case 'recommendations': return recommendations
      case 'conclusion': return conclusion
      default: return ''
    }
  }

  const setSectionContent = (sectionId: string, value: string) => {
    setHasUnsavedChanges(true)
    switch (sectionId) {
      case 'executive': setExecutiveSummary(value); break
      case 'scope': setScopeDescription(value); break
      case 'methodology': setMethodology(value); break
      case 'findings': setFindingsSummary(value); break
      case 'recommendations': setRecommendations(value); break
      case 'conclusion': setConclusion(value); break
    }
  }

  const getCompletionPercentage = () => {
    const requiredSections = sections.filter(s => s.required)
    const completed = requiredSections.filter(s => getSectionContent(s.id).trim().length > 0)
    return Math.round((completed.length / requiredSections.length) * 100)
  }

  const StatusIcon = statusConfig[status].icon

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="border-b bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-4 gap-6">
            <Skeleton className="h-[600px]" />
            <div className="col-span-3">
              <Skeleton className="h-[600px]" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!engagement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Engagement Not Found</h2>
          <p className="text-muted-foreground mb-4">Unable to load engagement data</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  // COMPLETED remains editable for report finalization — the report is often polished
  // after the assessment result is recorded but before the engagement is archived.
  const canEdit = engagement.status === 'IN_PROGRESS' || engagement.status === 'COMPLETED'
  const orgName = engagement.atoPackage.organization?.name || engagement.atoPackage.name
  const completionPct = getCompletionPercentage()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/engagements/${engagementId}`}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold">Assessment Report</h1>
                  <Badge className={`${statusConfig[status].bg} ${statusConfig[status].color}`}>
                    <StatusIcon className="h-3.5 w-3.5 mr-1" />
                    {statusConfig[status].label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  CMMC {engagement.targetLevel.replace('_', ' ')} Assessment for {orgName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Unsaved changes
                </span>
              )}

              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isPending || !canEdit}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Draft
              </Button>

              <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Report Preview</DialogTitle>
                    <DialogDescription>
                      Preview of the assessment report as it will appear to the customer
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto">
                    <ReportPreview
                      engagement={engagement}
                      orgName={orgName}
                      reportData={reportData}
                      executiveSummary={executiveSummary}
                      scopeDescription={scopeDescription}
                      methodology={methodology}
                      findingsSummary={findingsSummary}
                      recommendations={recommendations}
                      conclusion={conclusion}
                      preparedBy={preparedBy}
                      preparedAt={preparedAt}
                      approvedBy={approvedBy}
                      approvedAt={approvedAt}
                    />
                  </div>
                  <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={() => setShowPreview(false)}>
                      Close
                    </Button>
                    <Button disabled>
                      <Printer className="h-4 w-4 mr-2" />
                      Print Report
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {status === 'DRAFT' && completionPct === 100 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={isPending}>
                      <FileSignature className="h-4 w-4 mr-2" />
                      Submit for Review
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Submit Report for Review?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the report as ready for review. You can still make edits
                        until the report is approved and delivered.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleStatusChange('IN_REVIEW')}>
                        Submit for Review
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {status === 'IN_REVIEW' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700" disabled={isPending}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve Report
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Approve Assessment Report?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Approving this report confirms that all findings have been reviewed and the
                        report is accurate. After approval, the report can be delivered to the customer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleStatusChange('APPROVED')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve Report
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {status === 'APPROVED' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700" disabled={isPending}>
                      <Send className="h-4 w-4 mr-2" />
                      Deliver to Customer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deliver Report to Customer?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will make the report visible to the customer. They will receive a
                        notification and can view the full report in their dashboard.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleStatusChange('DELIVERED')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Deliver Report
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="space-y-6">
            {/* Report Progress */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Report Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-medium">{completionPct}%</span>
                  </div>
                  <Progress value={completionPct} className="h-2" />
                </div>

                <div className="space-y-1">
                  {sections.map((section) => {
                    const hasContent = getSectionContent(section.id).trim().length > 0
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                          activeSection === section.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        {hasContent ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className={`h-4 w-4 rounded-full border-2 ${
                            section.required
                              ? 'border-amber-400'
                              : 'border-gray-300 dark:border-gray-600'
                          }`} />
                        )}
                        <span className="flex-1">{section.label}</span>
                        {section.required && !hasContent && (
                          <span className="text-xs text-amber-500">Required</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Assessment Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Assessment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{orgName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>{engagement.targetLevel.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>{engagement.atoPackage.name}</span>
                </div>
                {engagement.actualStartDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Started {format(new Date(engagement.actualStartDate), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {engagement.leadAssessor && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Lead: {engagement.leadAssessor.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assessment Results */}
            {reportData?.stats && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Control Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Controls</span>
                      <span className="font-semibold">{reportData.stats.total}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Met
                      </span>
                      <span className="font-semibold text-green-600">{reportData.stats.met}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Not Met
                      </span>
                      <span className="font-semibold text-red-600">{reportData.stats.notMet}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                        N/A
                      </span>
                      <span className="font-semibold text-gray-500">{reportData.stats.notApplicable}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Editor */}
          <div className="col-span-3">
            <Card className="min-h-[600px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{sections.find(s => s.id === activeSection)?.label}</CardTitle>
                    <CardDescription>
                      {getSectionDescription(activeSection)}
                    </CardDescription>
                  </div>
                  {activeSection === 'findings' && reportData?.stats && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Generate summary from stats
                        const summary = generateFindingsSummary(reportData.stats, engagement.targetLevel)
                        setFindingsSummary(summary)
                        setHasUnsavedChanges(true)
                      }}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Auto-Generate Summary
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {activeSection === 'findings' && reportData?.stats && (
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-center">
                      <div className="text-3xl font-bold">{reportData.stats.total}</div>
                      <div className="text-sm text-muted-foreground">Total Controls</div>
                    </div>
                    <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-center">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {reportData.stats.met}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">Met</div>
                    </div>
                    <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-center">
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {reportData.stats.notMet}
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-300">Not Met</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-center">
                      <div className="text-3xl font-bold text-gray-500">{reportData.stats.notApplicable}</div>
                      <div className="text-sm text-muted-foreground">N/A</div>
                    </div>
                  </div>
                )}

                {activeSection === 'methodology' && (
                  <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Standard CMMC Assessment Methods
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li><strong>Interview:</strong> Discussions with personnel to verify understanding and implementation</li>
                      <li><strong>Examine:</strong> Review of documentation, policies, procedures, and artifacts</li>
                      <li><strong>Test:</strong> Technical validation and testing of security controls</li>
                    </ul>
                  </div>
                )}

                <Textarea
                  placeholder={getSectionPlaceholder(activeSection)}
                  value={getSectionContent(activeSection)}
                  onChange={(e) => setSectionContent(activeSection, e.target.value)}
                  rows={20}
                  disabled={!canEdit || status === 'DELIVERED'}
                  className="min-h-[400px] resize-none font-mono text-sm"
                />

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const currentIndex = sections.findIndex(s => s.id === activeSection)
                      if (currentIndex > 0) {
                        setActiveSection(sections[currentIndex - 1].id)
                      }
                    }}
                    disabled={activeSection === sections[0].id}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous Section
                  </Button>
                  <Button
                    onClick={() => {
                      const currentIndex = sections.findIndex(s => s.id === activeSection)
                      if (currentIndex < sections.length - 1) {
                        setActiveSection(sections[currentIndex + 1].id)
                      }
                    }}
                    disabled={activeSection === sections[sections.length - 1].id}
                  >
                    Next Section
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {engagement.status === 'COMPLETED' &&
              (engagement.assessmentResult === 'PASSED' ||
                engagement.assessmentResult === 'CONDITIONAL') && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileSignature className="h-4 w-4" />
                      Certificate
                    </CardTitle>
                    <CardDescription>
                      Generate a draft certificate PDF for review. The
                      official certificate will be issued by the Authorized
                      Certifying Official once backend signing support is
                      available.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DownloadCertificateButton engagementId={engagementId} />
                  </CardContent>
                </Card>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getSectionDescription(sectionId: string): string {
  switch (sectionId) {
    case 'executive':
      return 'Provide a high-level summary of the assessment for executive stakeholders'
    case 'scope':
      return 'Define what systems, processes, and locations were included in the assessment'
    case 'methodology':
      return 'Document the methods used to conduct the assessment'
    case 'findings':
      return 'Summary of assessment findings organized by control family'
    case 'recommendations':
      return 'Specific recommendations for addressing findings and improving security posture'
    case 'conclusion':
      return 'Final assessment conclusion and certification recommendation'
    default:
      return ''
  }
}

function getSectionPlaceholder(sectionId: string): string {
  switch (sectionId) {
    case 'executive':
      return 'Provide a concise summary of the assessment, key findings, and overall recommendation...\n\nExample:\nThis report documents the Cybersecurity Maturity Model Certification (CMMC) Level 2 assessment conducted for [Organization Name]. The assessment evaluated the organization\'s implementation of 110 security practices across 14 domains...'
    case 'scope':
      return 'Describe the assessment scope, including systems, networks, facilities, and personnel included...\n\nExample:\nThe scope of this assessment included:\n• Information systems processing, storing, or transmitting CUI\n• Network infrastructure supporting CUI-related operations\n• Physical facilities housing CUI systems\n• Personnel with access to CUI...'
    case 'methodology':
      return 'Describe the assessment methodology, including interview procedures, documentation review, and technical testing approaches...\n\nExample:\nThe assessment was conducted in accordance with the CMMC Assessment Guide and employed the following methods:\n• Interview: Discussions with key personnel across IT, security, and business functions\n• Examine: Review of policies, procedures, system configurations, and security artifacts\n• Test: Technical validation of security controls through live testing and demonstration...'
    case 'findings':
      return 'Provide a narrative summary of the findings, highlighting key areas of compliance and non-compliance...\n\nExample:\nThe assessment identified that the organization has implemented strong controls in [areas]. However, gaps were identified in [areas] that require remediation before certification can be achieved...'
    case 'recommendations':
      return 'Provide specific, actionable recommendations for remediation and improvement...\n\nExample:\n1. Access Control: Implement multi-factor authentication for all remote access to systems containing CUI\n2. Audit and Accountability: Deploy centralized log management and implement log retention policies\n3. Incident Response: Develop and test incident response procedures specific to CUI-related incidents...'
    case 'conclusion':
      return 'Provide the final assessment conclusion, including the certification recommendation (Pass, Conditional, Fail)...\n\nExample:\nBased on the findings of this assessment, [Organization Name] has demonstrated [substantial/partial/insufficient] compliance with CMMC Level 2 requirements. The assessment team recommends [PASSED/CONDITIONAL/NOT PASSED] certification pending [any conditions or requirements]...'
    default:
      return ''
  }
}

function generateFindingsSummary(stats: { met: number; notMet: number; notApplicable: number; total: number }, targetLevel: string): string {
  const passRate = Math.round((stats.met / (stats.total - stats.notApplicable)) * 100)

  return `Assessment Summary for CMMC ${targetLevel.replace('_', ' ')}

Total Controls Assessed: ${stats.total}
• Controls Met: ${stats.met} (${passRate}%)
• Controls Not Met: ${stats.notMet}
• Controls Not Applicable: ${stats.notApplicable}

${stats.notMet > 0
  ? `The assessment identified ${stats.notMet} control(s) that require remediation. A Plan of Action and Milestones (POA&M) should be developed to address these findings.`
  : 'The organization has successfully demonstrated compliance with all applicable controls.'
}

[Add detailed findings by control family below]`
}

interface ReportPreviewProps {
  engagement: EngagementData
  orgName: string
  reportData: ReportData | null
  executiveSummary: string
  scopeDescription: string
  methodology: string
  findingsSummary: string
  recommendations: string
  conclusion: string
  preparedBy: { name: string } | null
  preparedAt: Date | null
  approvedBy: { name: string } | null
  approvedAt: Date | null
}

function ReportPreview({
  engagement,
  orgName,
  reportData,
  executiveSummary,
  scopeDescription,
  methodology,
  findingsSummary,
  recommendations,
  conclusion,
  preparedBy,
  preparedAt,
  approvedBy,
  approvedAt,
}: ReportPreviewProps) {
  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-lg border">
      {/* Report Header */}
      <div className="text-center mb-8 pb-8 border-b">
        <div className="flex justify-center mb-4">
          <Shield className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">CMMC Assessment Report</h1>
        <p className="text-xl text-muted-foreground">
          {engagement.targetLevel.replace('_', ' ')} Certification Assessment
        </p>
        <div className="mt-4 text-lg font-semibold">{orgName}</div>
        <div className="text-muted-foreground">{engagement.atoPackage.name}</div>
      </div>

      {/* Report Metadata */}
      <div className="grid grid-cols-2 gap-6 mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase mb-2">Assessment Details</h3>
          <div className="space-y-2 text-sm">
            <div><strong>Target Level:</strong> {engagement.targetLevel.replace('_', ' ')}</div>
            {engagement.actualStartDate && (
              <div><strong>Start Date:</strong> {format(new Date(engagement.actualStartDate), 'MMMM d, yyyy')}</div>
            )}
            {engagement.actualCompletionDate && (
              <div><strong>Completion Date:</strong> {format(new Date(engagement.actualCompletionDate), 'MMMM d, yyyy')}</div>
            )}
            {(() => {
              const cmmcStatus = normalizeLegacyStatus(engagement.assessmentResult)
              if (!cmmcStatus) return null
              const config = CMMCStatusConfig[cmmcStatus]
              return (
                <div>
                  <strong>Result:</strong>{' '}
                  <span className={`font-semibold ${config.textClass}`}>{config.label}</span>
                </div>
              )
            })()}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase mb-2">Assessment Team</h3>
          <div className="space-y-2 text-sm">
            {engagement.leadAssessor && (
              <div><strong>Lead Assessor:</strong> {engagement.leadAssessor.name}</div>
            )}
            {preparedBy && preparedAt && (
              <div><strong>Prepared By:</strong> {preparedBy.name} on {format(new Date(preparedAt), 'MMM d, yyyy')}</div>
            )}
            {approvedBy && approvedAt && (
              <div><strong>Approved By:</strong> {approvedBy.name} on {format(new Date(approvedAt), 'MMM d, yyyy')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Assessment Results Summary */}
      {reportData?.stats && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Assessment Results Summary</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold">{reportData.stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Controls</div>
            </div>
            <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 text-center">
              <div className="text-2xl font-bold text-green-600">{reportData.stats.met}</div>
              <div className="text-sm text-green-700 dark:text-green-300">Met</div>
            </div>
            <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 text-center">
              <div className="text-2xl font-bold text-red-600">{reportData.stats.notMet}</div>
              <div className="text-sm text-red-700 dark:text-red-300">Not Met</div>
            </div>
            <div className="p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-gray-500">{reportData.stats.notApplicable}</div>
              <div className="text-sm text-muted-foreground">N/A</div>
            </div>
          </div>
        </div>
      )}

      {/* Report Sections */}
      <div className="space-y-8">
        {executiveSummary && (
          <section>
            <h2 className="text-xl font-bold mb-3 pb-2 border-b">1. Executive Summary</h2>
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
              {executiveSummary}
            </p>
          </section>
        )}

        {scopeDescription && (
          <section>
            <h2 className="text-xl font-bold mb-3 pb-2 border-b">2. Scope of Assessment</h2>
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
              {scopeDescription}
            </p>
          </section>
        )}

        {methodology && (
          <section>
            <h2 className="text-xl font-bold mb-3 pb-2 border-b">3. Assessment Methodology</h2>
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
              {methodology}
            </p>
          </section>
        )}

        {findingsSummary && (
          <section>
            <h2 className="text-xl font-bold mb-3 pb-2 border-b">4. Findings Summary</h2>
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
              {findingsSummary}
            </p>
          </section>
        )}

        {recommendations && (
          <section>
            <h2 className="text-xl font-bold mb-3 pb-2 border-b">5. Recommendations</h2>
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
              {recommendations}
            </p>
          </section>
        )}

        {conclusion && (
          <section>
            <h2 className="text-xl font-bold mb-3 pb-2 border-b">6. Conclusion</h2>
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
              {conclusion}
            </p>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>This report is confidential and intended solely for the use of {orgName}.</p>
        <p className="mt-2">Generated on {format(new Date(), 'MMMM d, yyyy')}</p>
      </div>
    </div>
  )
}
