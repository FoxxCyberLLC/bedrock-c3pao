import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { checkEngagementStatus } from '@/app/actions/engagements'

// Terminal statuses that permanently close a C3PAO's access to an engagement.
// COMPLETED is intentionally excluded — assessors can still view completed engagements
// in read-only mode (enforced by isReadOnly flag in engagement-detail.tsx).
const TERMINAL_STATUSES = new Set(['CANCELLED'])

export default async function EngagementLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const session = await requireAuth()
  if (!session) {
    redirect('/login')
  }

  const { id } = await params
  const status = await checkEngagementStatus(id)

  // Fail-closed: if the status check fails (backend unreachable) or the engagement
  // is in a terminal state, redirect back to the engagements list. The backend still
  // enforces access control on all data endpoints, so this is defense-in-depth.
  if (!status || TERMINAL_STATUSES.has(status.status)) {
    redirect('/engagements')
  }

  return <>{children}</>
}
