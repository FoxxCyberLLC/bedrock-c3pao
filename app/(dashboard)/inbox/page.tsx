'use client'

import { useCallback, useEffect, useState } from 'react'
import { Inbox as InboxIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NotificationsDropdown } from '@/components/notifications-dropdown'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/app/actions/notifications-inapp'

export default function InboxPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getNotifications()
      if (result.success && result.data) {
        setItems(result.data.items)
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleMarkRead = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    )
    await markNotificationRead(id)
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    setItems((prev) =>
      prev.map((item) =>
        item.readAt ? item : { ...item, readAt: new Date().toISOString() },
      ),
    )
    await markAllNotificationsRead()
  }, [])

  const hasUnread = items.some((item) => !item.readAt)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
          <p className="text-muted-foreground">
            Mentions, phase changes, QA assignments, and other notifications.
          </p>
        </div>
        {hasUnread && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleMarkAllRead()}
          >
            Mark all read
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <InboxIcon className="h-4 w-4" />
            Recent
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <NotificationsDropdown
            items={items}
            loading={loading}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            fullPage
          />
        </CardContent>
      </Card>
    </div>
  )
}
