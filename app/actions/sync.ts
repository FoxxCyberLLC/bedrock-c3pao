'use server'

// Sync is no longer needed — the C3PAO client talks directly to the Go API.
// These stubs exist for backward compatibility with any UI components that reference them.

export async function getSyncInfo(): Promise<{
  status: string
  pendingCount: number
  lastSyncAt: string | null
}> {
  return {
    status: 'idle',
    pendingCount: 0,
    lastSyncAt: null,
  }
}

export async function triggerSync(): Promise<{ success: boolean; error?: string }> {
  return { success: true }
}

export async function refreshEngagementCache(): Promise<{ success: boolean; error?: string }> {
  return { success: true }
}
