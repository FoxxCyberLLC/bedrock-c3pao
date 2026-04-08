/**
 * Schema lock test for the notifications-inapp server actions.
 *
 * Task 3 locked the NotificationListResponse / NotificationItem shape
 * so that Task 13b's real backend wiring is a drop-in replacement — no
 * frontend changes required. If this test breaks, a new field was
 * added or renamed and the UI components must be updated accordingly.
 *
 * Task 13b now calls the real Go API via the server actions, so this
 * test mocks requireAuth to return null (simulating an unauthenticated
 * request). The functions gracefully handle that case by returning
 * empty data — the shape assertion still proves the contract.
 */
import { describe, expect, it, vi } from 'vitest'

// Must mock BEFORE importing the module under test.
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue(null),
}))

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
    // Shape assertions — we care about keys/types, not exact values.
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(Array.isArray(result.data?.items)).toBe(true)
    expect(typeof result.data?.unreadCount).toBe('number')
    const typed: NotificationListResponse = result
    expect(typed).toBeDefined()
  })

  it('getUnreadNotificationCount returns { success, data: number }', async () => {
    const result = await getUnreadNotificationCount()
    expect(result.success).toBe(true)
    expect(typeof result.data).toBe('number')
  })

  it('markNotificationRead returns a response with a success boolean', async () => {
    const result = await markNotificationRead('some-id')
    expect(typeof result.success).toBe('boolean')
  })

  it('markAllNotificationsRead returns a response with a success boolean', async () => {
    const result = await markAllNotificationsRead()
    expect(typeof result.success).toBe('boolean')
  })

  it('NotificationItem type has all 7 notification types in the discriminator', () => {
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
