'use client'

import { Inbox, Building2, Paperclip, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface ESPMapping {
  id: string
  espId: string
  providerName: string
  inheritanceType: string | null
  espResponsibility: string | null
  oscResponsibility: string | null
}

export interface EvidenceMapping {
  evidenceId: string
  fileName: string
  fileUrl: string | null
  mimeType: string | null
  fileSize: number | null
  description: string | null
  uploadedAt: string
}

export interface OSCSubmissionContextData {
  inheritedStatus: string | null
  espMappings: ESPMapping[]
  evidenceMappings: EvidenceMapping[]
}

interface OSCSubmissionContextProps {
  oscContext: OSCSubmissionContextData
  engagementId: string
}

const oscInheritedBadgeClass: Record<string, string> = {
  NONE: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
  PARTIAL: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  FULL: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
}

/**
 * Read-only OSC submission context (inheritance claim, dependent ESPs, linked
 * evidence). Rendered on the OSC self-assessment side of the control detail
 * page. All fields come from the Go API ObjectiveView; no client-side math.
 */
export function OSCSubmissionContext({
  oscContext,
  engagementId,
}: OSCSubmissionContextProps) {
  const hasContent =
    !!oscContext.inheritedStatus ||
    oscContext.espMappings.length > 0 ||
    oscContext.evidenceMappings.length > 0

  if (!hasContent) return null

  return (
    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300">
        <Inbox className="h-4 w-4" />
        OSC Self-Assessment Submission
      </div>

      {oscContext.inheritedStatus && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Inheritance claim:</span>
          <Badge variant="outline" className={oscInheritedBadgeClass[oscContext.inheritedStatus] ?? ''}>
            {oscContext.inheritedStatus}
          </Badge>
        </div>
      )}

      {oscContext.espMappings.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" />
            Dependent ESPs ({oscContext.espMappings.length})
          </div>
          <div className="space-y-2">
            {oscContext.espMappings.map((esp) => (
              <div key={esp.id} className="rounded-md border bg-background/60 p-2 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{esp.providerName}</span>
                  {esp.inheritanceType && (
                    <Badge variant="outline" className="text-[10px]">{esp.inheritanceType}</Badge>
                  )}
                </div>
                {esp.espResponsibility && (
                  <div>
                    <span className="text-muted-foreground">ESP responsibility: </span>
                    <span className="whitespace-pre-line">{esp.espResponsibility}</span>
                  </div>
                )}
                {esp.oscResponsibility && (
                  <div>
                    <span className="text-muted-foreground">OSC responsibility: </span>
                    <span className="whitespace-pre-line">{esp.oscResponsibility}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {oscContext.evidenceMappings.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5" />
            Linked Evidence ({oscContext.evidenceMappings.length})
          </div>
          <div className="space-y-1">
            {oscContext.evidenceMappings.map((ev) => (
              <a
                key={ev.evidenceId}
                href={`/api/evidence/${engagementId}/${ev.evidenceId}/proxy`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border bg-background/60 px-2 py-1.5 text-xs hover:bg-muted/60 transition-colors"
                title={ev.description ?? undefined}
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{ev.fileName}</span>
                {ev.mimeType && (
                  <span className="text-[10px] text-muted-foreground">{ev.mimeType.split('/').pop()?.toUpperCase()}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
