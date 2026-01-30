'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Upload,
  Play,
  Flag,
  MessageSquare,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
  Bot,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Activity {
  id: string
  activityType: string
  title: string
  description?: string | null
  actorType: string
  actorId?: string | null
  actorName: string
  metadata?: string | null
  isPublic: boolean
  createdAt: Date | string
}

interface ActivityBoardProps {
  activities: Activity[]
  showPrivate?: boolean
  className?: string
  maxItems?: number
}

const activityIcons: Record<string, typeof CheckCircle> = {
  ENGAGEMENT_REQUESTED: Clock,
  ENGAGEMENT_ACCEPTED: CheckCircle,
  ENGAGEMENT_DECLINED: XCircle,
  ASSESSMENT_STARTED: Play,
  ASSESSMENT_PROGRESS: Flag,
  FINDING_RECORDED: AlertCircle,
  DOCUMENT_REQUESTED: FileText,
  DOCUMENT_UPLOADED: Upload,
  REPORT_DRAFT_READY: FileText,
  REPORT_DELIVERED: FileText,
  ASSESSMENT_COMPLETED: CheckCircle,
  STATUS_CHANGED: Flag,
  NOTE_ADDED: MessageSquare,
}

const activityColors: Record<string, string> = {
  ENGAGEMENT_REQUESTED: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
  ENGAGEMENT_ACCEPTED: 'text-green-500 bg-green-100 dark:bg-green-900/30',
  ENGAGEMENT_DECLINED: 'text-red-500 bg-red-100 dark:bg-red-900/30',
  ASSESSMENT_STARTED: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  ASSESSMENT_PROGRESS: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
  FINDING_RECORDED: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30',
  DOCUMENT_REQUESTED: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
  DOCUMENT_UPLOADED: 'text-cyan-500 bg-cyan-100 dark:bg-cyan-900/30',
  REPORT_DRAFT_READY: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30',
  REPORT_DELIVERED: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30',
  ASSESSMENT_COMPLETED: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  STATUS_CHANGED: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
  NOTE_ADDED: 'text-blue-400 bg-blue-100 dark:bg-blue-900/30',
}

const actorBadgeStyles: Record<string, string> = {
  c3pao: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  customer: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  system: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const actorIcons: Record<string, typeof User> = {
  c3pao: Building2,
  customer: User,
  system: Bot,
}

function ActivityItem({
  activity,
  isExpanded,
  onToggle,
}: {
  activity: Activity
  isExpanded: boolean
  onToggle: () => void
}) {
  const Icon = activityIcons[activity.activityType] || Flag
  const ActorIcon = actorIcons[activity.actorType] || User
  const colorClass = activityColors[activity.activityType] || 'text-gray-500 bg-gray-100'
  const actorBadgeClass = actorBadgeStyles[activity.actorType] || actorBadgeStyles.system

  const hasExpandableContent = activity.description || activity.metadata

  // Parse metadata if present
  let parsedMetadata: Record<string, unknown> | null = null
  if (activity.metadata) {
    try {
      parsedMetadata = JSON.parse(activity.metadata)
    } catch {
      // Ignore parse errors
    }
  }

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

      {/* Icon */}
      <div
        className={cn(
          'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          colorClass
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div
          className={cn(
            'rounded-lg border bg-white dark:bg-gray-900 p-4 shadow-sm',
            hasExpandableContent && 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-600'
          )}
          onClick={hasExpandableContent ? onToggle : undefined}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {activity.title}
                </h4>
                {!activity.isPublic && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    Internal
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-2 text-sm">
                {/* Actor badge */}
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
                    actorBadgeClass
                  )}
                >
                  <ActorIcon className="h-3 w-3" />
                  {activity.actorName}
                </span>

                {/* Timestamp */}
                <span className="text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(activity.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>

            {/* Expand button */}
            {hasExpandableContent && (
              <button
                type="button"
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
            )}
          </div>

          {/* Expanded content */}
          {isExpanded && hasExpandableContent && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              {activity.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {activity.description}
                </p>
              )}

              {parsedMetadata && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Details
                  </p>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(parsedMetadata).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-gray-500 dark:text-gray-400 capitalize">
                          {key.replace(/_/g, ' ')}
                        </dt>
                        <dd className="text-gray-900 dark:text-white font-medium">
                          {String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ActivityBoard({
  activities,
  showPrivate = false,
  className,
  maxItems,
}: ActivityBoardProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  // Filter private activities if needed
  const filteredActivities = showPrivate
    ? activities
    : activities.filter((a) => a.isPublic)

  // Limit items if maxItems is set and not showing all
  const displayedActivities =
    maxItems && !showAll
      ? filteredActivities.slice(0, maxItems)
      : filteredActivities

  const hasMore = maxItems && filteredActivities.length > maxItems && !showAll

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (filteredActivities.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 text-center',
          className
        )}
      >
        <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          No Activity Yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Activity will appear here as the assessment progresses.
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="relative">
        {displayedActivities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            isExpanded={expandedIds.has(activity.id)}
            onToggle={() => toggleExpanded(activity.id)}
          />
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-4 w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
        >
          Show {filteredActivities.length - (maxItems || 0)} more activities
        </button>
      )}
    </div>
  )
}

// Compact version for sidebars
export function ActivityBoardCompact({
  activities,
  maxItems = 5,
  className,
}: {
  activities: Activity[]
  maxItems?: number
  className?: string
}) {
  const filteredActivities = activities.filter((a) => a.isPublic).slice(0, maxItems)

  if (filteredActivities.length === 0) {
    return (
      <div className={cn('text-sm text-gray-500 dark:text-gray-400 py-4', className)}>
        No recent activity
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {filteredActivities.map((activity) => {
        const Icon = activityIcons[activity.activityType] || Flag
        const colorClass =
          activityColors[activity.activityType] || 'text-gray-500 bg-gray-100'

        return (
          <div key={activity.id} className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                colorClass
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {activity.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(new Date(activity.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
