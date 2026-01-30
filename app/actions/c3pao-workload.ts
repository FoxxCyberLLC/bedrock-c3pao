'use server'

import { getWorkloadData as _getWorkload } from './team'

export async function getC3PAOWorkloadOverview() {
  return _getWorkload()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAssessorWorkload(assessorId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  return { success: true, data: null }
}
