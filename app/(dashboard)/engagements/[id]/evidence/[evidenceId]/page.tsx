import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requireAuth } from '@/lib/auth'
import { getEngagementEvidence } from '@/app/actions/engagements'
import { EvidenceReviewPage } from '@/components/c3pao/evidence/evidence-review-page'

interface PageProps {
  params: Promise<{ id: string; evidenceId: string }>
}

export default async function EvidenceDetailPage({ params }: PageProps) {
  const session = await requireAuth()
  if (!session) redirect('/login')

  const { id: engagementId, evidenceId } = await params
  const result = await getEngagementEvidence(engagementId)
  if (!result.success || !result.data) notFound()

  const evidence = result.data.find((e) => e.id === evidenceId)
  if (!evidence) notFound()

  return (
    <div className="container mx-auto py-6 space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/engagements/${engagementId}`}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Engagement
        </Link>
      </Button>

      <EvidenceReviewPage
        evidence={evidence}
        engagementId={engagementId}
        currentUserId={session.c3paoUser.id}
      />
    </div>
  )
}
