'use client'

/**
 * Notifications dropdown panel.
 *
 * Rendered inside the bell's Popover (header dropdown) and on the
 * `/inbox` full-page view. Shows the most recent notifications with type
 * icons, actor names, timestamps, and an unread dot. Clicking an item
 * marks it read and (if `engagementId` is set) navigates to that
 * engagement's detail page.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import {
  AtSign,
  CheckCircle2,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { safeDate } from '@/lib/utils'
import type {
  NotificationItem,
  NotificationType,
} from '@/app/actions/notifications-inapp'

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  MENTION: AtSign,
  FINDING_SUBMITTED: MessageSquare,
  PHASE_ADVANCED: TrendingUp,
  QA_ASSIGNED: CheckCircle2,
  COI_FLAGGED: ShieldAlert,
  CERT_EXPIRING: ShieldCheck,
  POAM_CLOSEOUT_DUE: ShieldAlert,
}

interface NotificationsDropdownProps {
  items: NotificationItem[]
  loading: boolean
  onMarkRead: (id: string) => void | Promise<void>
  onMarkAllRead: () => void | Promise<void>
  onClose?: () => void
  /** When true, render the full-page layout (used by /inbox). */
  fullPage?: boolean
}

export function NotificationsDropdown({
  items,
  loading,
  onMarkRead,
  onMarkAllRead,
  onClose,
  fullPage = false,
}: NotificationsDropdownProps) {
  const router = useRouter()

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.readAt) {
      await onMarkRead(item.id)
    }
    if (item.engagementId) {
      onClose?.()
      router.push(`/engagements/${item.engagementId}`)
    }
  }

  const hasUnread = items.some((item) => !item.readAt)

  return (
    <div className={fullPage ? 'divide-y' : 'max-h-[400px] overflow-hidden'}>
      {!fullPage && (
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {hasUnread && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMarkAllRead()}
              className="h-7 text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm font-medium">You&apos;re all caught up.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Notifications appear here when teammates mention you, submit
            findings for review, or when key dates approach.
          </p>
        </div>
      ) : (
        <ul
          className={
            fullPage ? 'divide-y' : 'divide-y overflow-y-auto max-h-[320px]'
          }
        >
          {items.slice(0, fullPage ? items.length : 10).map((item) => {
            const Icon = TYPE_ICON[item.type]
            const unread = !item.readAt
            const when = safeDate(item.createdAt)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className="relative w-full px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  {unread && (
                    <span
                      aria-hidden="true"
                      className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-primary"
                    />
                  )}
                  <div className="flex items-start gap-3 pl-3">
                    <Icon
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{item.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.actorName ? `${item.actorName} · ` : ''}
                        {when ? formatDistanceToNow(when, { addSuffix: true }) : ''}
                        {item.engagementName
                          ? ` · ${item.engagementName}`
                          : ''}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!fullPage && (
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full justify-center">
            <Link href="/inbox" onClick={onClose}>
              Open inbox
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
