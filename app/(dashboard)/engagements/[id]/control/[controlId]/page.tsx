import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEngagementControlDetail } from '@/app/actions/engagements'
import { getEngagementPhase } from '@/app/actions/c3pao-phase'
import { ControlDetailPage } from '@/components/c3pao/control-detail-page'
import { dispatchEngagementById } from '@/lib/engagement/dispatch-by-id'
import { getOutsideEngagementControlDetail } from '@/lib/db-outside-control-detail'

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

  const dispatch = await dispatchEngagementById(id)

  if (dispatch.kind === 'outside_osc') {
    const result = await getOutsideEngagementControlDetail(id, controlId)
    if (!result.success || !result.data) {
      notFound()
    }
    return (
      <ControlDetailPage
        engagementId={id}
        engagement={result.data.engagement}
        control={result.data.control}
        navigation={result.data.navigation}
        user={session.c3paoUser}
        currentPhase={null}
        engagementKind="outside_osc"
      />
    )
  }

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
      engagement={controlResult.data.engagement}
      control={controlResult.data.control}
      navigation={controlResult.data.navigation}
      user={session.c3paoUser}
      currentPhase={currentPhase}
      engagementKind="osc"
    />
  )
}
