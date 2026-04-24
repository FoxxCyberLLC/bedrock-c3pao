import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEngagementControlDetail } from '@/app/actions/engagements'
import { getEngagementPhase } from '@/app/actions/c3pao-phase'
import { ControlDetailPage } from '@/components/c3pao/control-detail-page'

export default async function ControlPage({
  params,
}: {
  params: Promise<{ id: string; controlId: string }>
}) {
  const session = await requireAuth()
  if (!session) {
    redirect('/login')
  }

  const { id, controlId } = await params

  // Fetch control detail and engagement phase in parallel.
  // Phase is best-effort — fall back to null if it fails so the page still renders.
  const [controlResult, phaseResult] = await Promise.all([
    getEngagementControlDetail(id, controlId),
    getEngagementPhase(id).catch(() => null),
  ])

  if (!controlResult.success || !controlResult.data) {
    notFound()
  }

  const currentPhase = phaseResult?.success
    ? (phaseResult.data?.currentPhase ?? null)
    : null

  return (
    <ControlDetailPage
      engagementId={id}
      engagement={controlResult.data.engagement as any}
      control={controlResult.data.control as any}
      navigation={controlResult.data.navigation as any}
      user={session.c3paoUser as any}
      currentPhase={currentPhase}
    />
  )
}
