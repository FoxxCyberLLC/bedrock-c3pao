'use client'

/**
 * Notifications bell for the app header.
 *
 * Polls `getUnreadNotificationCount` every 60 seconds and renders a badge
 * when there are unread notifications (capped at "9+"). Opens a popover
 * dropdown showing the 10 most recent notifications on click.
 *
 * Task 3 wires this to the locked-schema stub actions. Task 13b swaps
 * the stub for real Go API data without changing this component.
 */

import { useCallback, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/app/actions/notifications-inapp'
import { NotificationsDropdown } from '@/components/notifications-dropdown'

const POLL_INTERVAL_MS = 60_000

export function NotificationsBell() {
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [loadingList, setLoadingList] = useState(false)

  /** Fetch the unread count. Silent on error — offline keeps the last value. */
  const refreshUnreadCount = useCallback(async () => {
    try {
      const result = await getUnreadNotificationCount()
      if (result.success && typeof result.data === 'number') {
        setUnreadCount(result.data)
      }
    } catch (err) {
      console.warn('Failed to fetch unread notification count:', err)
    }
  }, [])

  // Initial poll + 60s interval. Cleaned up on unmount.
  useEffect(() => {
    refreshUnreadCount()
    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refreshUnreadCount])

  // Fetch the full list when the dropdown opens.
  const handleOpenChange = useCallback(
    async (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (!nextOpen) return

      setLoadingList(true)
      try {
        const result = await getNotifications()
        if (result.success && result.data) {
          setItems(result.data.items)
          setUnreadCount(result.data.unreadCount)
        }
      } catch (err) {
        console.warn('Failed to fetch notifications:', err)
      } finally {
        setLoadingList(false)
      }
    },
    [],
  )

  const handleMarkRead = useCallback(
    async (id: string) => {
      // Optimistic update — mark locally first, then fire the action.
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      await markNotificationRead(id)
    },
    [],
  )

  const handleMarkAllRead = useCallback(async () => {
    setItems((prev) =>
      prev.map((item) =>
        item.readAt ? item : { ...item, readAt: new Date().toISOString() },
      ),
    )
    setUnreadCount(0)
    await markAllNotificationsRead()
  }, [])

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount)

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              data-testid="unread-badge"
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground"
              aria-label={`${unreadCount} unread notifications`}
            >
              {badgeLabel}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <NotificationsDropdown
          items={items}
          loading={loadingList}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}
