'use server'

// Assessment mode toggle stub for standalone
// In standalone, assessment mode is always active when engagement status is IN_PROGRESS
export async function toggleAssessmentMode(engagementId: string, active: boolean): Promise<{ success: boolean; assessmentModeActive: boolean; error?: string }> {
  return { success: true, assessmentModeActive: active }
}
