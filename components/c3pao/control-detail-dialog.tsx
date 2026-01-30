'use client'

import { format } from 'date-fns'
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Minus,
  FileText,
  ExternalLink,
  Download,
  ScrollText,
  StickyNote,
  FileCheck,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

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

interface ControlDetailDialogProps {
  control: RequirementStatus | null
  open: boolean
  onOpenChange: (open: boolean) => void
  readOnly?: boolean
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

  if (mimeType.startsWith('image/')) {
    return <FileText className="h-5 w-5 text-blue-500" />
  }
  if (mimeType === 'application/pdf') {
    return <FileText className="h-5 w-5 text-red-500" />
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileText className="h-5 w-5 text-green-500" />
  }
  if (mimeType.includes('document') || mimeType.includes('word')) {
    return <FileText className="h-5 w-5 text-blue-600" />
  }

  return <FileText className="h-5 w-5" />
}

export function ControlDetailDialog({
  control,
  open,
  onOpenChange,
  readOnly = true,
}: ControlDetailDialogProps) {
  if (!control) return null

  const status = statusConfig[control.status] || statusConfig.NOT_STARTED
  const StatusIcon = status.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Badge className={familyColors[control.requirement.family.code] || 'bg-gray-500/10'}>
              {control.requirement.family.code}
            </Badge>
            <code className="text-lg font-mono font-semibold">
              {control.requirement.requirementId}
            </code>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${status.bgColor}`}>
              <StatusIcon className={`h-4 w-4 ${status.color}`} />
              <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
            </div>
          </div>
          <DialogTitle className="text-xl">{control.requirement.title}</DialogTitle>
          <DialogDescription>
            {control.requirement.family.name}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <Tabs defaultValue="requirement" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="requirement" className="gap-2">
                <ScrollText className="h-4 w-4" />
                Requirement
              </TabsTrigger>
              <TabsTrigger value="assessment" className="gap-2">
                <StickyNote className="h-4 w-4" />
                Assessment
              </TabsTrigger>
              <TabsTrigger value="evidence" className="gap-2">
                <FileCheck className="h-4 w-4" />
                Evidence ({control.evidence.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requirement" className="mt-4 space-y-4">
              {/* Basic Requirement */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Basic Security Requirement</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {control.requirement.basicRequirement}
                  </p>
                </CardContent>
              </Card>

              {/* Derived Requirement */}
              {control.requirement.derivedRequirement && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Derived Security Requirement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {control.requirement.derivedRequirement}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Discussion */}
              {control.requirement.discussion && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Discussion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {control.requirement.discussion}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="assessment" className="mt-4 space-y-4">
              {/* Implementation Notes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Implementation Notes</CardTitle>
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

              {/* Assessment Notes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Assessment Notes</CardTitle>
                  <CardDescription>
                    Assessment findings and observations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {control.assessmentNotes ? (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {control.assessmentNotes}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed rounded-lg">
                      <StickyNote className="mx-auto h-8 w-8 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        No assessment notes provided
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Summary */}
              <Card className={status.bgColor}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`h-8 w-8 ${status.color}`} />
                    <div>
                      <div className={`text-lg font-semibold ${status.color}`}>
                        Control Status: {status.label}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {control.status === 'COMPLIANT' && 'This control has been assessed and meets the requirement.'}
                        {control.status === 'NON_COMPLIANT' && 'This control has been assessed and does not meet the requirement.'}
                        {control.status === 'IN_PROGRESS' && 'Implementation of this control is in progress.'}
                        {control.status === 'NOT_STARTED' && 'Assessment of this control has not started.'}
                        {control.status === 'NOT_APPLICABLE' && 'This control is not applicable to this system.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="evidence" className="mt-4 space-y-4">
              {control.evidence.length > 0 ? (
                <div className="space-y-3">
                  {control.evidence.map((ev) => (
                    <Card key={ev.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getFileIcon(ev.mimeType)}
                            <div>
                              <div className="font-medium text-sm">{ev.fileName}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {formatFileSize(ev.fileSize)} • Uploaded {format(new Date(ev.createdAt), 'MMM d, yyyy')}
                              </div>
                              {ev.description && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {ev.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled>
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm" disabled>
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No Evidence Files</h3>
                    <p className="text-muted-foreground mt-1">
                      No evidence has been linked to this control yet
                    </p>
                  </CardContent>
                </Card>
              )}

              {readOnly && control.evidence.length > 0 && (
                <div className="text-xs text-muted-foreground text-center">
                  Evidence files are read-only during assessment review
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <Separator className="my-4" />

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
