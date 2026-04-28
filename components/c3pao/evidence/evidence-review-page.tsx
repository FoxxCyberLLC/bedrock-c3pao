'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { AlertCircle, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { InternalReviewThread } from '@/components/c3pao/internal-review-thread'
import type { EvidenceView } from '@/lib/api-client'
import { EvidencePreview } from './evidence-preview'
import {
  ObjectivesAssessmentSidebar,
  type LinkedObjective,
} from './objectives-assessment-sidebar'

interface EvidenceReviewPageProps {
  evidence: EvidenceView
  engagementId: string
  currentUserId: string
  /** OSC vs outside_osc — drives the proxy URL + linking backend. */
  engagementKind: 'osc' | 'outside_osc'
  /** All objectives for this engagement — populates the link picker. */
  allObjectives: ReadonlyArray<LinkedObjective>
  /** Initially-linked objective ids for this evidence. */
  initialLinkedObjectiveIds: ReadonlyArray<string>
}

export function EvidenceReviewPage({
  evidence,
  engagementId,
  currentUserId,
  engagementKind,
  allObjectives,
  initialLinkedObjectiveIds,
}: EvidenceReviewPageProps) {
  // Capture the current time once on first render (lazy init). Re-renders on
  // tab toggles / link state changes do not need a fresh `now` — expiration
  // hints are intentionally low-precision.
  const [now] = useState(() => Date.now())
  const isExpired = evidence.expirationDate
    ? new Date(evidence.expirationDate).getTime() < now
    : false
  const isExpiringSoon = evidence.expirationDate
    ? (() => {
        const days = Math.ceil(
          (new Date(evidence.expirationDate).getTime() - now) /
            (1000 * 60 * 60 * 24),
        )
        return days <= 30 && days > 0
      })()
    : false

  // Default to the Objectives tab when this evidence already has linked
  // objectives — that's what the assessor most likely wants to see.
  const defaultTab = initialLinkedObjectiveIds.length > 0 ? 'objectives' : 'details'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      {/*
        IMPORTANT: <EvidencePreview> is a sibling of the right column. Its
        only props are `evidence`, `engagementId`, and `engagementKind` —
        none of which depend on right-column tab state. React reconciliation
        will not re-mount the iframe when the right column updates, so the
        PDF viewer's scroll position is preserved across tab toggles, link/
        unlink, and objective marking. Do NOT pass right-column-derived
        props down here.
      */}
      <EvidencePreview
        evidence={evidence}
        engagementId={engagementId}
        engagementKind={engagementKind}
      />

      <div className="space-y-4 min-w-0">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="w-full">
            <TabsTrigger value="objectives" className="flex-1">
              Objectives
              {initialLinkedObjectiveIds.length > 0 && (
                <Badge variant="secondary" className="ml-1.5">
                  {initialLinkedObjectiveIds.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="details" className="flex-1">
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="objectives" className="mt-3 space-y-3">
            <ObjectivesAssessmentSidebar
              engagementId={engagementId}
              evidenceId={evidence.id}
              engagementKind={engagementKind}
              allObjectives={allObjectives}
              initialLinkedIds={initialLinkedObjectiveIds}
            />
          </TabsContent>

          <TabsContent value="details" className="mt-3 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Uploaded</span>
                  <span>
                    {format(new Date(evidence.uploadedAt), 'MMM d, yyyy')}
                  </span>
                </div>
                {evidence.uploadedBy && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">By</span>
                    <span className="truncate max-w-[180px]">
                      {evidence.uploadedBy}
                    </span>
                  </div>
                )}
                {evidence.expirationDate && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Expiration</span>
                      <span
                        className={
                          isExpired
                            ? 'text-red-600 font-medium'
                            : isExpiringSoon
                              ? 'text-yellow-600 font-medium'
                              : ''
                        }
                      >
                        {format(new Date(evidence.expirationDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {(isExpired || isExpiringSoon) && (
                      <div
                        className={`flex items-center gap-1.5 text-xs ${isExpired ? 'text-red-600' : 'text-yellow-600'}`}
                      >
                        <AlertCircle className="h-3 w-3" aria-hidden />
                        {isExpired
                          ? 'This evidence has expired'
                          : 'Expiring within 30 days'}
                      </div>
                    )}
                  </>
                )}
                {evidence.description && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Description
                      </span>
                      <p className="mt-1 whitespace-pre-wrap">
                        {evidence.description}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" aria-hidden />
                  Linked Controls (legacy)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {evidence.requirementIds && evidence.requirementIds.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {evidence.requirementIds.map((reqId) => (
                      <Badge
                        key={reqId}
                        variant="secondary"
                        className="font-mono text-xs"
                      >
                        {reqId}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No legacy control links. Use the Objectives tab to link
                    this evidence to specific assessment objectives.
                  </p>
                )}
              </CardContent>
            </Card>

            {engagementKind === 'osc' && (
              <InternalReviewThread
                engagementId={engagementId}
                entityType="EVIDENCE"
                entityId={evidence.id}
                currentUserId={currentUserId}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
