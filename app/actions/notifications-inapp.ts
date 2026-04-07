'use server'

/**
 * Notifications server actions.
 *
 * This module locks the return shape that Task 13b will eventually back
 * with real Go API calls. Until then, every action returns an empty but
 * correctly-typed response so the notifications bell, inbox page, and
 * polling hooks can be built and tested against the final schema.
 *
 * ⚠️ DO NOT change `NotificationItem` or `NotificationListResponse`
 * without also updating Task 13b's implementation plan — the shape is
 * exercised by a schema-lock test at
 * `__tests__/actions/notifications-inapp.test.ts`.
 */

/** Discriminated notification type. Must match Task 13b's Go API payloads. */
export type NotificationType =
  | 'MENTION'
  | 'FINDING_SUBMITTED'
  | 'PHASE_ADVANCED'
  | 'QA_ASSIGNED'
  | 'COI_FLAGGED'
  | 'CERT_EXPIRING'
  | 'POAM_CLOSEOUT_DUE'

/** A single notification row displayed in the bell dropdown / inbox page. */
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

/** List response for `getNotifications`. Items + unreadCount together. */
export interface NotificationListResponse {
  success: boolean
  data?: { items: NotificationItem[]; unreadCount: number }
  error?: string
}

/** Unread count response for the bell poll. */
export interface UnreadCountResponse {
  success: boolean
  data?: number
  error?: string
}

/** Basic ack response for mark-read actions. */
export interface AckResponse {
  success: boolean
  error?: string
}

/**
 * Return the most recent notifications for the current user.
 * Stub: returns an empty list. Task 13b wires this to the Go API and
 * adds a `limit` parameter for pagination.
 */
export async function getNotifications(): Promise<NotificationListResponse> {
  return { success: true, data: { items: [], unreadCount: 0 } }
}

/**
 * Return the current user's unread notification count.
 * Stub: returns 0. Task 13b wires this to the Go API.
 */
export async function getUnreadNotificationCount(): Promise<UnreadCountResponse> {
  return { success: true, data: 0 }
}

/**
 * Mark a single notification as read.
 * Stub: no-op. Task 13b wires this to the Go API and consumes the id.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function markNotificationRead(notificationId: string): Promise<AckResponse> {
  return { success: true }
}

/**
 * Mark all notifications for the current user as read.
 * Stub: no-op. Task 13b wires this to the Go API.
 */
export async function markAllNotificationsRead(): Promise<AckResponse> {
  return { success: true }
}
