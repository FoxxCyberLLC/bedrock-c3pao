'use server'

// ESP (External Service Provider) actions — stubs until Go API supports ESPs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getESPsByEngagement(engagementId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  return { success: true, data: [] }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getESPDetailForEngagement(engagementId: string, espId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  return { success: false, error: 'ESP details not yet available via API' }
}
