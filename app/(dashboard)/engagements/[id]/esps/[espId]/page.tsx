import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getESPDetailForEngagement } from '@/app/actions/c3pao-esp'
import { C3PAOESPDetailView } from '@/components/c3pao/c3pao-esp-detail-view'

export default async function C3PAOESPDetailPage({
  params,
}: {
  params: Promise<{ id: string; espId: string }>
}) {
  const session = await requireAuth()
  if (!session) {
    redirect('/login')
  }

  const { id, espId } = await params
  const result = await getESPDetailForEngagement(id, espId)

  if (!result.success || !result.data) {
    notFound()
  }

  return <C3PAOESPDetailView esp={result.data} engagementId={id} />
}
