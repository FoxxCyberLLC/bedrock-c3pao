'use client'

import { useState, useEffect, useTransition } from 'react'
import { format } from 'date-fns'
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
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  saveAssessmentReport,
  getAssessmentReport,
  updateReportStatus,
  generateReportData,
} from '@/app/actions/c3pao-assessment'

type ReportStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'DELIVERED'

interface AssessmentReportEditorProps {
  engagementId: string
  isLeadAssessor: boolean
  engagementStatus: string
  organizationName: string
  targetLevel: string
}

const statusConfig: Record<ReportStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  DRAFT: { label: 'Draft', icon: FileText, color: 'bg-gray-500/10 text-gray-600' },
  IN_REVIEW: { label: 'In Review', icon: Clock, color: 'bg-yellow-500/10 text-yellow-600' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, color: 'bg-green-500/10 text-green-600' },
  DELIVERED: { label: 'Delivered', icon: Send, color: 'bg-blue-500/10 text-blue-600' },
}

export function AssessmentReportEditor({
  engagementId,
  isLeadAssessor,
  engagementStatus,
  organizationName,
  targetLevel,
}: AssessmentReportEditorProps) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)

  // Report state
  const [reportId, setReportId] = useState<string | null>(null)
  const [status, setStatus] = useState<ReportStatus>('DRAFT')
  const [executiveSummary, setExecutiveSummary] = useState('')
  const [scopeDescription, setScopeDescription] = useState('')
  const [methodology, setMethodology] = useState('')
  const [findingsSummary, setFindingsSummary] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [conclusion, setConclusion] = useState('')

  // Report metadata
  const [preparedBy, setPreparedBy] = useState<{ name: string } | null>(null)
  const [preparedAt, setPreparedAt] = useState<Date | null>(null)
  const [approvedBy, setApprovedBy] = useState<{ name: string } | null>(null)
  const [approvedAt, setApprovedAt] = useState<Date | null>(null)

  // Report data for preview
  const [reportData, setReportData] = useState<{
    stats: { met: number; notMet: number; notApplicable: number; total: number }
    findingsByFamily: Record<string, { family: { code: string; name: string }; findings: unknown[] }>
  } | null>(null)

  // Load existing report
  useEffect(() => {
    async function loadReport() {
      setIsLoading(true)
      const [reportResult, dataResult] = await Promise.all([
        getAssessmentReport(engagementId),
        generateReportData(engagementId),
      ])

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
      }

      if (dataResult.success) {
        setReportData(dataResult.data as typeof reportData)
      }

      setIsLoading(false)
    }
    loadReport()
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
        toast.success('Report saved')
        if (!reportId) {
          setReportId(result.data.id)
        }
        setPreparedAt(new Date())
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
        toast.success(`Report status updated to ${statusConfig[newStatus].label}`)
        if (newStatus === 'APPROVED') {
          setApprovedAt(new Date())
        }
      } else {
        toast.error(result.error || 'Failed to update status')
      }
    })
  }

  const StatusIcon = statusConfig[status].icon

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const canEdit = engagementStatus === 'IN_PROGRESS' || engagementStatus === 'COMPLETED'

  return (
    <div className="space-y-4">
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Assessment Report
              </CardTitle>
              <CardDescription>
                CMMC {targetLevel.replace('_', ' ')} Assessment Report for {organizationName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusConfig[status].color}>
                <StatusIcon className="h-3.5 w-3.5 mr-1" />
                {statusConfig[status].label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {preparedBy && preparedAt && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">Prepared By</div>
                <div className="font-medium">{preparedBy.name}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(preparedAt), 'PPP')}</div>
              </div>
            )}
            {approvedBy && approvedAt && (
              <div className="p-3 rounded-lg bg-green-500/10">
                <div className="text-xs text-muted-foreground">Approved By</div>
                <div className="font-medium">{approvedBy.name}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(approvedAt), 'PPP')}</div>
              </div>
            )}
            {reportData?.stats && (
              <>
                <div className="p-3 rounded-lg bg-green-500/10">
                  <div className="text-xs text-muted-foreground">Controls Met</div>
                  <div className="text-2xl font-bold text-green-600">{reportData.stats.met}</div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10">
                  <div className="text-xs text-muted-foreground">Findings (Not Met)</div>
                  <div className="text-2xl font-bold text-red-600">{reportData.stats.notMet}</div>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <Button onClick={handleSave} disabled={isPending || !canEdit}>
              {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Draft
            </Button>

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Report Preview</DialogTitle>
                  <DialogDescription>
                    Preview of the assessment report as it will appear to the customer
                  </DialogDescription>
                </DialogHeader>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <h1>CMMC Assessment Report</h1>
                  <p><strong>Organization:</strong> {organizationName}</p>
                  <p><strong>Target Level:</strong> {targetLevel.replace('_', ' ')}</p>

                  {executiveSummary && (
                    <>
                      <h2>Executive Summary</h2>
                      <p className="whitespace-pre-wrap">{executiveSummary}</p>
                    </>
                  )}

                  {scopeDescription && (
                    <>
                      <h2>Scope of Assessment</h2>
                      <p className="whitespace-pre-wrap">{scopeDescription}</p>
                    </>
                  )}

                  {methodology && (
                    <>
                      <h2>Assessment Methodology</h2>
                      <p className="whitespace-pre-wrap">{methodology}</p>
                    </>
                  )}

                  {findingsSummary && (
                    <>
                      <h2>Findings Summary</h2>
                      <p className="whitespace-pre-wrap">{findingsSummary}</p>
                    </>
                  )}

                  {recommendations && (
                    <>
                      <h2>Recommendations</h2>
                      <p className="whitespace-pre-wrap">{recommendations}</p>
                    </>
                  )}

                  {conclusion && (
                    <>
                      <h2>Conclusion</h2>
                      <p className="whitespace-pre-wrap">{conclusion}</p>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" disabled>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>

            {isLeadAssessor && status === 'DRAFT' && (
              <Button variant="outline" onClick={() => handleStatusChange('IN_REVIEW')} disabled={isPending}>
                <Clock className="h-4 w-4 mr-2" />
                Submit for Review
              </Button>
            )}

            {isLeadAssessor && status === 'IN_REVIEW' && (
              <Button onClick={() => handleStatusChange('APPROVED')} disabled={isPending}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Report
              </Button>
            )}

            {isLeadAssessor && status === 'APPROVED' && (
              <Button onClick={() => handleStatusChange('DELIVERED')} disabled={isPending}>
                <Send className="h-4 w-4 mr-2" />
                Deliver to Customer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Sections */}
      <Tabs defaultValue="executive" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="executive">Executive Summary</TabsTrigger>
          <TabsTrigger value="scope">Scope</TabsTrigger>
          <TabsTrigger value="methodology">Methodology</TabsTrigger>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="conclusion">Conclusion</TabsTrigger>
        </TabsList>

        <TabsContent value="executive">
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
              <CardDescription>
                High-level summary of the assessment for executive stakeholders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Provide a concise summary of the assessment, key findings, and overall recommendation..."
                value={executiveSummary}
                onChange={(e) => setExecutiveSummary(e.target.value)}
                rows={10}
                disabled={!canEdit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scope">
          <Card>
            <CardHeader>
              <CardTitle>Scope of Assessment</CardTitle>
              <CardDescription>
                Define what systems, processes, and locations were included in the assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Describe the assessment scope, including systems, networks, facilities, and personnel included..."
                value={scopeDescription}
                onChange={(e) => setScopeDescription(e.target.value)}
                rows={10}
                disabled={!canEdit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methodology">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Methodology</CardTitle>
              <CardDescription>
                Document the methods used to conduct the assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Describe the assessment methodology, including interview procedures, documentation review, and technical testing approaches..."
                value={methodology}
                onChange={(e) => setMethodology(e.target.value)}
                rows={10}
                disabled={!canEdit}
              />
              <div className="mt-4 p-4 rounded-lg bg-muted/50">
                <div className="text-sm font-medium mb-2">Standard CMMC Assessment Methods:</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><strong>Interview:</strong> Discussions with personnel to verify understanding and implementation</li>
                  <li><strong>Examine:</strong> Review of documentation, policies, procedures, and artifacts</li>
                  <li><strong>Test:</strong> Technical validation and testing of security controls</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="findings">
          <Card>
            <CardHeader>
              <CardTitle>Findings Summary</CardTitle>
              <CardDescription>
                Summary of assessment findings organized by control family
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reportData?.stats && (
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-2xl font-bold">{reportData.stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total Controls</div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 text-center">
                    <div className="text-2xl font-bold text-green-600">{reportData.stats.met}</div>
                    <div className="text-xs text-muted-foreground">Met</div>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 text-center">
                    <div className="text-2xl font-bold text-red-600">{reportData.stats.notMet}</div>
                    <div className="text-xs text-muted-foreground">Not Met</div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-400/10 text-center">
                    <div className="text-2xl font-bold text-gray-500">{reportData.stats.notApplicable}</div>
                    <div className="text-xs text-muted-foreground">N/A</div>
                  </div>
                </div>
              )}

              <Textarea
                placeholder="Provide a narrative summary of the findings, highlighting key areas of compliance and non-compliance..."
                value={findingsSummary}
                onChange={(e) => setFindingsSummary(e.target.value)}
                rows={10}
                disabled={!canEdit}
              />

              {reportData?.stats.notMet && reportData.stats.notMet > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-700">POA&M Required</div>
                    <div className="text-sm text-muted-foreground">
                      {reportData.stats.notMet} finding(s) require remediation through a Plan of Action & Milestones
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>
                Specific recommendations for addressing findings and improving security posture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Provide specific, actionable recommendations for remediation and improvement..."
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                rows={10}
                disabled={!canEdit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conclusion">
          <Card>
            <CardHeader>
              <CardTitle>Conclusion</CardTitle>
              <CardDescription>
                Final assessment conclusion and certification recommendation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Provide the final assessment conclusion, including the certification recommendation (Pass, Conditional, Fail)..."
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                rows={10}
                disabled={!canEdit}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
