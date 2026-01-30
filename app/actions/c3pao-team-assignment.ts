'use server'

import { getEngagementTeam as _getTeam } from './engagements'

export async function getEngagementTeam(engagementId: string) {
  return _getTeam(engagementId)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAvailableAssessors(engagementId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  return { success: true, data: [] }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function assignAssessorToEngagement(...args: any[]) {
  return { success: false, error: 'Team assignment not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function removeAssessorFromEngagement(...args: any[]) {
  return { success: false, error: 'Team assignment not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateAssessorRole(...args: any[]) {
  return { success: false, error: 'Team assignment not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function assignControlsToAssessor(...args: any[]) {
  return { success: false, error: 'Control assignment not available in standalone mode' }
}
