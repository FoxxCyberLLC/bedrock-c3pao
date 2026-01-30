'use server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StubResult = { success: boolean; error?: string; data?: any; message?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createMilestone(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Milestone management not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateMilestone(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Milestone management not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deleteMilestone(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Milestone management not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function toggleMilestoneCompletion(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Milestone management not available in standalone mode' }
}
