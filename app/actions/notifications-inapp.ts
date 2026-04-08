'use server'

/**
 * Notifications server actions.
 *
 * Task 13b: these are now backed by the real Go API. Task 3 locked the
 * return shape — the functions below keep that shape exactly so the
 * NotificationsBell, NotificationsDropdown, and /inbox page work
 * unchanged.
 */

import { requireAuth } from '@/lib/auth'
import {
  fetchApiNotifications,
  fetchApiUnreadCount,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  type ApiNotificationItem,
} from '@/lib/api-client'

/** Discriminated notification type. Kept for backward compatibility with Task 3. */
export type NotificationType =
  | 'MENTION'
  | 'FINDING_SUBMITTED'
  | 'PHASE_ADVANCED'
  | 'QA_ASSIGNED'
  | 'COI_FLAGGED'
  | 'CERT_EXPIRING'
  | 'POAM_CLOSEOUT_DUE'

/** Shape the UI components import — locked by the Task 3 schema test. */
export interface NotificationItem {
  id: string
  type: NotificationType
  engagementId: string | null
  engagementName: string | null
  actorName: string | null
  body: string
  readAt: string | null
  createdAt: string
}

export interface NotificationListResponse {
  success: boolean
  data?: { items: NotificationItem[]; unreadCount: number }
  error?: string
}

export interface UnreadCountResponse {
  success: boolean
  data?: number
  error?: string
}

export interface AckResponse {
  success: boolean
  error?: string
}

/** Narrow the raw API type to the locked frontend type. */
function toNotificationItem(api: ApiNotificationItem): NotificationItem {
  return {
    id: api.id,
    type: (api.type as NotificationType) ?? 'MENTION',
    engagementId: api.engagementId,
    engagementName: api.engagementName,
    actorName: api.actorName,
    body: api.body,
    readAt: api.readAt,
    createdAt: api.createdAt,
  }
}

export async function getNotifications(): Promise<NotificationListResponse> {
  try {
    const session = await requireAuth()
    if (!session)
      return { success: true, data: { items: [], unreadCount: 0 } }
    const list = await fetchApiNotifications(session.apiToken)
    return {
      success: true,
      data: {
        items: list.items.map(toNotificationItem),
        unreadCount: list.unreadCount,
      },
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to load notifications',
    }
  }
}

export async function getUnreadNotificationCount(): Promise<UnreadCountResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: true, data: 0 }
    const count = await fetchApiUnreadCount(session.apiToken)
    return { success: true, data: count }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to load unread count',
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function markNotificationRead(notificationId: string): Promise<AckResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    await apiMarkNotificationRead(notificationId, session.apiToken)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to mark read',
    }
  }
}

export async function markAllNotificationsRead(): Promise<AckResponse> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    await apiMarkAllNotificationsRead(session.apiToken)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to mark all read',
    }
  }
}
