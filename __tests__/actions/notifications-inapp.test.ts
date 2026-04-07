/**
 * Schema lock test for the notifications-inapp server actions.
 *
 * Task 3 locks the NotificationListResponse / NotificationItem shape so that
 * Task 13b's real backend wiring is a drop-in replacement — no frontend
 * changes required. If this test breaks, a new field was added or renamed
 * and Task 13b's implementation must be updated accordingly.
 */
import { describe, expect, it } from 'vitest'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
  type NotificationListResponse,
} from '@/app/actions/notifications-inapp'

describe('notifications-inapp server actions schema lock', () => {
  it('getNotifications returns the locked NotificationListResponse shape', async () => {
    const result = await getNotifications()
    expect(result).toEqual({
      success: true,
      data: { items: [], unreadCount: 0 },
    })
    // TypeScript type assertion: the shape is NotificationListResponse
    const typed: NotificationListResponse = result
    expect(typed.success).toBe(true)
    expect(Array.isArray(typed.data?.items)).toBe(true)
    expect(typeof typed.data?.unreadCount).toBe('number')
  })

  it('getUnreadNotificationCount returns { success, data: number }', async () => {
    const result = await getUnreadNotificationCount()
    expect(result).toEqual({ success: true, data: 0 })
  })

  it('markNotificationRead returns { success } without throwing', async () => {
    const result = await markNotificationRead('some-id')
    expect(result).toEqual({ success: true })
  })

  it('markAllNotificationsRead returns { success } without throwing', async () => {
    const result = await markAllNotificationsRead()
    expect(result).toEqual({ success: true })
  })

  it('NotificationItem type has all 7 notification types in the discriminator', () => {
    // This test is a compile-time assertion — the annotation below must match
    // all valid NotificationItem types exactly.
    const allTypes: NotificationItem['type'][] = [
      'MENTION',
      'FINDING_SUBMITTED',
      'PHASE_ADVANCED',
      'QA_ASSIGNED',
      'COI_FLAGGED',
      'CERT_EXPIRING',
      'POAM_CLOSEOUT_DUE',
    ]
    expect(allTypes).toHaveLength(7)
  })
})
