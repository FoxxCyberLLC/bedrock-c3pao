'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, Check, CheckCheck, Trash2, X, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
} from '@/app/actions/notifications-inapp'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  linkUrl?: string | null
  linkText?: string | null
  isRead: boolean
  readAt?: Date | null
  engagementId?: string | null
  createdAt: Date | string
}

interface NotificationBellProps {
  recipientType: 'customer' | 'c3pao_user'
  recipientId: string
  pollingInterval?: number // in milliseconds
  className?: string
}

const notificationTypeColors: Record<string, string> = {
  ASSESSMENT_REQUESTED: 'bg-yellow-500',
  ASSESSMENT_ACCEPTED: 'bg-green-500',
  ASSESSMENT_DECLINED: 'bg-red-500',
  ASSESSMENT_STARTED: 'bg-blue-500',
  ASSESSMENT_PROGRESS: 'bg-purple-500',
  ASSESSMENT_COMPLETED: 'bg-emerald-500',
  FINDING_READY: 'bg-orange-500',
  REPORT_READY: 'bg-indigo-500',
  ACTION_REQUIRED: 'bg-red-500',
  DOCUMENT_REQUESTED: 'bg-amber-500',
  GENERAL_UPDATE: 'bg-gray-500',
}

export function NotificationBell({
  recipientType,
  recipientId,
  pollingInterval = 30000, // 30 seconds default
  className,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const [notifResult, countResult] = await Promise.all([
        getNotifications(recipientType, recipientId, 20),
        getUnreadNotificationCount(recipientType, recipientId),
      ])

      if (notifResult.success && notifResult.data) {
        setNotifications(notifResult.data)
      }
      if (countResult.success && typeof countResult.data === 'number') {
        setUnreadCount(countResult.data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }, [recipientType, recipientId])

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications()

    const interval = setInterval(fetchNotifications, pollingInterval)
    return () => clearInterval(interval)
  }, [fetchNotifications, pollingInterval])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle mark as read
  const handleMarkRead = async (notificationId: string) => {
    const result = await markNotificationRead(notificationId)
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    setIsLoading(true)
    const result = await markAllNotificationsRead(recipientType, recipientId)
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
      )
      setUnreadCount(0)
    }
    setIsLoading(false)
  }

  // Handle clear all
  const handleClearAll = async () => {
    setIsLoading(true)
    const result = await clearAllNotifications(recipientType, recipientId)
    if (result.success) {
      setNotifications([])
      setUnreadCount(0)
    }
    setIsLoading(false)
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[70vh] overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isLoading}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={isLoading}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  title="Clear all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[calc(70vh-60px)] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Bell className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onClose={() => setIsOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationItem({
  notification,
  onMarkRead,
  onClose,
}: {
  notification: Notification
  onMarkRead: (id: string) => void
  onClose: () => void
}) {
  const dotColor =
    notificationTypeColors[notification.type] || notificationTypeColors.GENERAL_UPDATE

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkRead(notification.id)
    }
    if (notification.linkUrl) {
      onClose()
      window.location.href = notification.linkUrl
    }
  }

  return (
    <div
      className={cn(
        'px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
        notification.linkUrl && 'cursor-pointer',
        !notification.isRead && 'bg-blue-50/50 dark:bg-blue-900/10'
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Type indicator */}
        <div className="shrink-0 mt-1.5">
          <div className={cn('h-2 w-2 rounded-full', dotColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                'text-sm',
                notification.isRead
                  ? 'text-gray-600 dark:text-gray-400'
                  : 'text-gray-900 dark:text-white font-medium'
              )}
            >
              {notification.title}
            </p>
            {!notification.isRead && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkRead(notification.id)
                }}
                className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                title="Mark as read"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
            {notification.message}
          </p>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
              })}
            </span>

            {notification.linkUrl && notification.linkText && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                {notification.linkText}
                <ExternalLink className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Standalone unread count badge for use in navigation
export function NotificationBadge({
  recipientType,
  recipientId,
  className,
}: {
  recipientType: 'customer' | 'c3pao_user'
  recipientId: string
  className?: string
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      const result = await getUnreadNotificationCount(recipientType, recipientId)
      if (result.success && typeof result.data === 'number') {
        setCount(result.data)
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [recipientType, recipientId])

  if (count === 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
