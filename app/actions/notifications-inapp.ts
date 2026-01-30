'use server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StubResult = { success: boolean; error?: string; data?: any; message?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getNotifications(...args: any[]): Promise<StubResult> {
  return { success: true, data: [] }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUnreadNotificationCount(...args: any[]): Promise<StubResult> {
  return { success: true, data: 0 }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function markNotificationRead(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Notifications not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function markAllNotificationsRead(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Notifications not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function clearAllNotifications(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Notifications not available in standalone mode' }
}
