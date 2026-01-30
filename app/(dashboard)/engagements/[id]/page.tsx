import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEngagementById } from '@/app/actions/engagements'
import { EngagementDetail } from '@/components/c3pao/engagement-detail'
import { LimitedEngagementDetail } from '@/components/c3pao/limited-engagement-detail'

export default async function EngagementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireAuth()
  if (!session) {
    redirect('/login')
  }

  const { id } = await params
  const result = await getEngagementById(id)

  if (!result.success || !result.data) {
    notFound()
  }

  // For pre-access engagements (introduction phase), show limited view
  if (result.accessLevel === 'NONE') {
    return <LimitedEngagementDetail engagement={result.data as any} user={session.c3paoUser} />
  }

  // For read-only and assess access, show full engagement detail
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <EngagementDetail engagement={result.data as any} user={session.c3paoUser} />
}
