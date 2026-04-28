import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEngagementById } from '@/app/actions/engagements'
import {
  getReadinessAuditLog,
  getReadinessChecklist,
} from '@/app/actions/c3pao-readiness'
import { getEngagementSchedule } from '@/app/actions/c3pao-schedule'
import { getEngagementPhase } from '@/app/actions/c3pao-phase'
import { listSnapshotsAction } from '@/app/actions/engagements'
import { EngagementDetail } from '@/components/c3pao/engagement-detail'
import { LimitedEngagementDetail } from '@/components/c3pao/limited-engagement-detail'
import { dispatchEngagementById } from '@/lib/engagement/dispatch-by-id'
import { outsideToCommon } from '@/lib/engagement/outside-to-common'
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

  // Source dispatch: local outside engagement vs Go-API OSC.
  const dispatch = await dispatchEngagementById(id)

  if (dispatch.kind === 'outside_osc') {
    // Outside engagements skip Go-API supplemental fetches entirely. Phase
    // and snapshots have no outside equivalent in v1; readiness + schedule
    // come from local Postgres and accept the outside UUID natively.
    const [
      readinessChecklistResult,
      readinessAuditResult,
      scheduleResult,
    ] = await Promise.all([
      getReadinessChecklist(id),
      getReadinessAuditLog(id),
      getEngagementSchedule(id),
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

    return (
      <EngagementDetail
        engagement={outsideToCommon(dispatch.engagement)}
        user={session.c3paoUser}
        initialChecklist={initialChecklist}
        initialAuditEntries={initialAuditEntries}
        initialSchedule={initialSchedule}
        initialPhase={null}
        currentPhase={null}
        initialSnapshots={[]}
        kind="outside_osc"
      />
    )
  }

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
    snapshotsResult,
  ] = await Promise.all([
    getReadinessChecklist(id),
    getReadinessAuditLog(id),
    getEngagementSchedule(id),
    getEngagementPhase(id),
    listSnapshotsAction(id),
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

  const initialSnapshots =
    snapshotsResult.success && snapshotsResult.data ? snapshotsResult.data : []

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
      initialSnapshots={initialSnapshots}
      kind="osc"
    />
  )
}
