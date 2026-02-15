'use server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getNotifications(recipientType?: string, recipientId?: string, limit?: number): Promise<{ success: boolean; error?: string; data?: any[] }> {
  // Notifications are scoped to OSC organizations, not C3PAO users
  return { success: true, data: [] }
}

export async function getUnreadNotificationCount(recipientType?: string, recipientId?: string): Promise<{ success: boolean; error?: string; data?: number }> {
  return { success: true, data: 0 }
}

export async function markNotificationRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  return { success: true }
}

export async function markAllNotificationsRead(recipientType?: string, recipientId?: string): Promise<{ success: boolean; error?: string }> {
  return { success: true }
}

export async function clearAllNotifications(recipientType?: string, recipientId?: string): Promise<{ success: boolean; error?: string }> {
  return { success: true }
}
