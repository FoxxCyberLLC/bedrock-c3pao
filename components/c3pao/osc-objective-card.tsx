'use client'

import {
  ChevronRight,
  FileText,
  ScrollText,
  StickyNote,
  MessageSquare,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface OSCObjectiveStatus {
  implementationStatement: string | null
  evidenceDescription: string | null
  assessmentNotes: string | null
}

interface AssessmentObjective {
  id: string
  objectiveReference: string
  description: string
  oscStatuses?: OSCObjectiveStatus[]
}

export function OSCObjectiveCard({ objective }: { objective: AssessmentObjective }) {
  const objStatus = objective.oscStatuses?.[0]
  const hasData = objStatus && (
    objStatus.implementationStatement ||
    objStatus.evidenceDescription ||
    objStatus.assessmentNotes
  )

  return (
    <Collapsible>
      <div className={`border rounded-lg ${hasData ? 'border-blue-500/30' : 'border-border'}`}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-90" />
              <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                {objective.objectiveReference}
              </code>
              <span className="text-sm text-muted-foreground line-clamp-1 max-w-md">
                {objective.description}
              </span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded shrink-0">
              {hasData ? (
                <Badge variant="outline" className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                  Provided
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Empty
                </Badge>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t">
            {/* Objective Description */}
            <div className="bg-muted/50 p-3 rounded-lg text-sm mt-3">
              <div className="font-medium mb-1">Objective:</div>
              <p className="text-muted-foreground">{objective.description}</p>
            </div>

            {hasData ? (
              <>
                {objStatus.implementationStatement && (
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      Implementation Statement
                    </Label>
                    <div className="bg-blue-500/5 p-3 rounded-lg border border-blue-500/20">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{objStatus.implementationStatement}</p>
                    </div>
                  </div>
                )}
                {objStatus.evidenceDescription && (
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <ScrollText className="h-3.5 w-3.5" />
                      Evidence Description
                    </Label>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">{objStatus.evidenceDescription}</p>
                    </div>
                  </div>
                )}
                {objStatus.assessmentNotes && (
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      OSC Notes
                    </Label>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">{objStatus.assessmentNotes}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 border border-dashed rounded-lg">
                <StickyNote className="mx-auto h-6 w-6 text-muted-foreground/50" />
                <p className="mt-1 text-xs text-muted-foreground">No self-assessment data provided</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
