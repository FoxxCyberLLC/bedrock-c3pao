import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEngagementControlDetail } from '@/app/actions/engagements'
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
  const result = await getEngagementControlDetail(id, controlId)

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
    />
  )
}
