/**
 * Server-side guard helper. If the engagement id resolves to an outside
 * engagement, throw a Next.js redirect to the engagement root. Use this at
 * the top of any sub-route page or layout that has no outside-equivalent
 * data source (poams, ssp, stigs, esps, report).
 */

import { redirect } from 'next/navigation'
import { dispatchEngagementById } from './dispatch-by-id'

export async function redirectIfOutsideEngagement(id: string): Promise<void> {
  const dispatch = await dispatchEngagementById(id)
  if (dispatch.kind === 'outside_osc') {
    redirect(`/engagements/${id}`)
  }
}
