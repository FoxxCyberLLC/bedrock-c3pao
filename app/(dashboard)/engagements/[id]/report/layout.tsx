/**
 * Server-side guard for the C3PAO report sub-route. Outside engagements
 * have no formal final-report flow in v1, so we redirect them to the
 * engagement root rather than hitting Go-API code paths that will fail.
 */

import { redirectIfOutsideEngagement } from '@/lib/engagement/redirect-if-outside'

export default async function ReportLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await redirectIfOutsideEngagement(id)
  return <>{children}</>
}
