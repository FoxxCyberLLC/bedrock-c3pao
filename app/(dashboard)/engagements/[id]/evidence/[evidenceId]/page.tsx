import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requireAuth } from '@/lib/auth'
import { getEngagementEvidence } from '@/app/actions/engagements'
import { fetchObjectives } from '@/lib/api-client'
import { EvidenceReviewPage } from '@/components/c3pao/evidence/evidence-review-page'
import { dispatchEngagementById } from '@/lib/engagement/dispatch-by-id'
import {
  listOutsideEvidenceAction,
  listOutsideObjectivesForEvidenceAction,
} from '@/app/actions/c3pao-outside-engagement'
import { mergeOutsideObjectivesWithCatalog } from '@/lib/db-outside-assessments'
import type { LinkedObjective } from '@/components/c3pao/evidence/objectives-assessment-sidebar'

interface PageProps {
  params: Promise<{ id: string; evidenceId: string }>
}

export default async function EvidenceDetailPage({ params }: PageProps) {
  const session = await requireAuth()
  if (!session) redirect('/login')

  const { id: engagementId, evidenceId } = await params
  const dispatch = await dispatchEngagementById(engagementId)

  if (dispatch.kind === 'outside_osc') {
    const [evidenceList, objectives, linksResult] = await Promise.all([
      listOutsideEvidenceAction(engagementId),
      mergeOutsideObjectivesWithCatalog(engagementId),
      listOutsideObjectivesForEvidenceAction(engagementId, evidenceId),
    ])
    if (!evidenceList.success || !evidenceList.data) notFound()
    const evidence = evidenceList.data.find((e) => e.id === evidenceId)
    if (!evidence) notFound()
    const allObjectives: LinkedObjective[] = objectives.map((o) => ({
      id: o.objectiveId,
      reference: o.objectiveReference,
      status: o.status,
      description: o.description,
    }))
    const initialLinkedIds: string[] =
      linksResult.success && linksResult.data ? linksResult.data : []

    return (
      <div className="container mx-auto py-6 space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/engagements/${engagementId}`}>
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
            Back to Engagement
          </Link>
        </Button>
        <EvidenceReviewPage
          evidence={evidence}
          engagementId={engagementId}
          currentUserId={session.c3paoUser.id}
          engagementKind="outside_osc"
          allObjectives={allObjectives}
          initialLinkedObjectiveIds={initialLinkedIds}
        />
      </div>
    )
  }

  // OSC engagement path: existing Go API flow.
  const [evidenceResult, oscObjectives] = await Promise.all([
    getEngagementEvidence(engagementId),
    fetchObjectives(engagementId, session.apiToken).catch(() => []),
  ])
  if (!evidenceResult.success || !evidenceResult.data) notFound()
  const evidence = evidenceResult.data.find((e) => e.id === evidenceId)
  if (!evidence) notFound()

  // Map OSC objectives onto the LinkedObjective shape for the sidebar.
  // Initially-linked ids come from the existing requirementIds field on
  // EvidenceView (legacy control linkage); v1 read-only on the OSC side.
  const allObjectives: LinkedObjective[] = oscObjectives.map((o) => ({
    id: o.objectiveId,
    reference: o.objectiveReference,
    status: o.status,
    description: o.description,
  }))
  const initialLinkedIds = evidence.requirementIds ?? []

  return (
    <div className="container mx-auto py-6 space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/engagements/${engagementId}`}>
          <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
          Back to Engagement
        </Link>
      </Button>
      <EvidenceReviewPage
        evidence={evidence}
        engagementId={engagementId}
        currentUserId={session.c3paoUser.id}
        engagementKind="osc"
        allObjectives={allObjectives}
        initialLinkedObjectiveIds={initialLinkedIds}
      />
    </div>
  )
}
