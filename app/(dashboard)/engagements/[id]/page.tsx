import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEngagementById } from '@/app/actions/engagements'
import {
  getReadinessAuditLog,
  getReadinessChecklist,
} from '@/app/actions/c3pao-readiness'
import { getEngagementSchedule } from '@/app/actions/c3pao-schedule'
import { getEngagementPhase } from '@/app/actions/c3pao-phase'
import { EngagementDetail } from '@/components/c3pao/engagement-detail'
import { LimitedEngagementDetail } from '@/components/c3pao/limited-engagement-detail'
import type { AuditEntry, ReadinessChecklist } from '@/lib/readiness-types'
import type { EngagementSchedule } from '@/lib/db-schedule'
import type { EngagementPhase } from '@/lib/api-client'

const EMPTY_CHECKLIST: ReadinessChecklist = {
  engagementId: '',
  items: [],
  completedCount: 0,
  totalCount: 8,
  canStart: false,
}

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

  // Fetch supplemental data for the Assessment + Engagement tab groups in
  // parallel. Each fetch is defensive — a failure must not break the page.
  const [
    readinessChecklistResult,
    readinessAuditResult,
    scheduleResult,
    phaseResult,
  ] = await Promise.all([
    getReadinessChecklist(id),
    getReadinessAuditLog(id),
    getEngagementSchedule(id),
    getEngagementPhase(id),
  ])

  const initialChecklist: ReadinessChecklist =
    readinessChecklistResult.success && readinessChecklistResult.data
      ? readinessChecklistResult.data
      : { ...EMPTY_CHECKLIST, engagementId: id }
  const initialAuditEntries: AuditEntry[] =
    readinessAuditResult.success && readinessAuditResult.data
      ? readinessAuditResult.data
      : []
  const initialSchedule: EngagementSchedule | null =
    scheduleResult.success && scheduleResult.data ? scheduleResult.data : null
  const initialPhase: EngagementPhase | null =
    phaseResult.success && phaseResult.data ? phaseResult.data : null
  const currentPhase: string | null = initialPhase?.currentPhase ?? null

  // For read-only and assess access, show full engagement detail
  return (
    <EngagementDetail
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      engagement={result.data as any}
      user={session.c3paoUser}
      initialChecklist={initialChecklist}
      initialAuditEntries={initialAuditEntries}
      initialSchedule={initialSchedule}
      initialPhase={initialPhase}
      currentPhase={currentPhase}
    />
  )
}
