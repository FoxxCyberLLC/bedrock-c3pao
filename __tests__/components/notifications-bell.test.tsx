/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'

// Mock the server actions so the bell can be rendered in isolation without
// hitting the Go API or the `requireAuth` server-side helper.
vi.mock('@/app/actions/notifications-inapp', () => ({
  getUnreadNotificationCount: vi.fn(),
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}))

import { NotificationsBell } from '@/components/notifications-bell'
import * as actions from '@/app/actions/notifications-inapp'

describe('NotificationsBell', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(actions.getUnreadNotificationCount).mockReset()
    vi.mocked(actions.getNotifications).mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders the bell button with no badge when unreadCount is 0', async () => {
    vi.mocked(actions.getUnreadNotificationCount).mockResolvedValue({
      success: true,
      data: 0,
    })

    render(<NotificationsBell />)

    // Let the initial poll resolve
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    const button = screen.getByRole('button', { name: /notifications/i })
    expect(button).toBeInTheDocument()
    // When count is 0, no numeric badge is shown
    expect(screen.queryByTestId('unread-badge')).toBeNull()
  })

  it('renders a numeric badge when unreadCount is between 1 and 9', async () => {
    vi.mocked(actions.getUnreadNotificationCount).mockResolvedValue({
      success: true,
      data: 3,
    })

    render(<NotificationsBell />)
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    const badge = screen.getByTestId('unread-badge')
    expect(badge).toHaveTextContent('3')
  })

  it('caps the badge at "9+" when unreadCount is greater than 9', async () => {
    vi.mocked(actions.getUnreadNotificationCount).mockResolvedValue({
      success: true,
      data: 27,
    })

    render(<NotificationsBell />)
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    const badge = screen.getByTestId('unread-badge')
    expect(badge).toHaveTextContent('9+')
  })

  it('polls the unread count on mount and again every 60 seconds', async () => {
    vi.mocked(actions.getUnreadNotificationCount).mockResolvedValue({
      success: true,
      data: 0,
    })

    render(<NotificationsBell />)
    // Let the initial mount poll(s) settle. React 19 strict mode may
    // double-invoke the effect in dev; we only assert the polling interval
    // from the post-mount baseline.
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    const mountCalls = vi.mocked(actions.getUnreadNotificationCount).mock.calls.length
    expect(mountCalls).toBeGreaterThanOrEqual(1)

    // Advance 60 seconds → exactly one more poll per interval tick.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(vi.mocked(actions.getUnreadNotificationCount).mock.calls.length).toBe(
      mountCalls + 1,
    )

    // Advance another 60s → one more.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(vi.mocked(actions.getUnreadNotificationCount).mock.calls.length).toBe(
      mountCalls + 2,
    )
  })

  it('stops polling and clears the interval on unmount', async () => {
    vi.mocked(actions.getUnreadNotificationCount).mockResolvedValue({
      success: true,
      data: 0,
    })

    const { unmount } = render(<NotificationsBell />)
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    const beforeUnmount = vi.mocked(actions.getUnreadNotificationCount).mock.calls.length
    expect(beforeUnmount).toBeGreaterThanOrEqual(1)

    unmount()

    // Advance time well past a poll interval — no new calls should happen.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })
    expect(vi.mocked(actions.getUnreadNotificationCount).mock.calls.length).toBe(
      beforeUnmount,
    )
  })

  it('silently handles a failing unread count fetch (no badge, no throw)', async () => {
    vi.mocked(actions.getUnreadNotificationCount).mockRejectedValue(
      new Error('offline'),
    )

    // Silence the expected warning from the fetch error
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => {
      render(<NotificationsBell />)
    }).not.toThrow()

    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    // Offline → no badge shown
    expect(screen.queryByTestId('unread-badge')).toBeNull()

    consoleWarnSpy.mockRestore()
  })
})
