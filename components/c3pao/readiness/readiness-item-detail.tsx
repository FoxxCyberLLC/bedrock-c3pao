'use client'

/**
 * Right column of the readiness workspace: artifacts, completion /
 * waiver controls, and a filtered audit feed for the selected item.
 * Pure presentation; parent owns server-action orchestration via the
 * callback props.
 */

import { format, formatDistanceToNow } from 'date-fns'
import {
  CheckCircle2,
  History,
  Loader2,
  RotateCcw,
  ShieldOff,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { READINESS_ITEM_DEFINITIONS } from '@/lib/readiness-items'
import { safeDate } from '@/lib/utils'
import type {
  AuditEntry,
  ReadinessArtifact,
  ReadinessItem,
} from '@/lib/readiness-types'

import { ArtifactUpload } from './artifact-upload'

const ACTIVITY_PREVIEW_COUNT = 15

export interface ReadinessItemDetailProps {
  engagementId: string
  item: ReadinessItem
  auditEntries: AuditEntry[]
  isLead: boolean
  currentUserEmail: string
  pendingAction?: boolean
  onComplete: () => void | Promise<void>
  onReopen: () => void | Promise<void>
  onWaive: () => void
  onRevokeWaiver: () => void | Promise<void>
  onArtifactsChanged?: () => void
}

function auditLabel(action: AuditEntry['action']): string {
  switch (action) {
    case 'item_completed':
      return 'Marked complete'
    case 'item_uncompleted':
      return 'Re-opened'
    case 'waiver_granted':
      return 'Granted waiver'
    case 'waiver_revoked':
      return 'Revoked waiver'
    case 'artifact_uploaded':
      return 'Uploaded artifact'
    case 'artifact_removed':
      return 'Removed artifact'
    case 'phase_advanced':
      return 'Advanced phase'
    case 'audit_exported':
      return 'Exported audit bundle'
    case 'note_created':
      return 'Created note'
    case 'note_edited':
      return 'Edited note'
    case 'note_deleted':
      return 'Deleted note'
    default:
      return action
  }
}

function auditDetail(entry: AuditEntry): string | null {
  const d = entry.details
  if (!d) return null
  if (typeof d.filename === 'string') return d.filename
  if (typeof d.reason === 'string') return d.reason
  return null
}

function StatusBadge({ item }: { item: ReadinessItem }): React.ReactElement {
  if (item.status === 'complete') {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
        Complete
      </Badge>
    )
  }
  if (item.status === 'waived') {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
        Waived
      </Badge>
    )
  }
  if (item.status === 'in_progress') {
    return (
      <Badge className="bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100">
        In progress
      </Badge>
    )
  }
  return <Badge variant="outline">Not started</Badge>
}

function CompletionBlock({
  item,
  isLead,
  pendingAction,
  onComplete,
  onReopen,
  onWaive,
  onRevokeWaiver,
}: {
  item: ReadinessItem
  isLead: boolean
  pendingAction?: boolean
  onComplete: () => void | Promise<void>
  onReopen: () => void | Promise<void>
  onWaive: () => void
  onRevokeWaiver: () => void | Promise<void>
}): React.ReactElement {
  if (item.status === 'complete') {
    const when = safeDate(item.completedAt)
    const whenText = when ? format(when, 'PPP p') : ''
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          <CheckCircle2
            className="mr-1.5 inline h-4 w-4 text-emerald-600"
            aria-hidden
          />
          Marked complete by{' '}
          <span className="font-medium">{item.completedBy ?? 'someone'}</span>
          {whenText && <span className="text-muted-foreground"> · {whenText}</span>}
        </p>
        {isLead && (
          <Button
            size="sm"
            variant="outline"
            disabled={pendingAction}
            onClick={onReopen}
          >
            {pendingAction ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Re-open
          </Button>
        )}
      </div>
    )
  }

  if (item.status === 'waived') {
    return (
      <div className="space-y-2">
        <p className="text-sm">
          <ShieldOff
            className="mr-1.5 inline h-4 w-4 text-amber-600"
            aria-hidden
          />
          Waived by <span className="font-medium">{item.waivedBy ?? 'someone'}</span>
        </p>
        {item.waiverReason && (
          <p className="rounded-md border bg-muted/30 p-3 text-sm italic text-muted-foreground">
            &ldquo;{item.waiverReason}&rdquo;
          </p>
        )}
        {isLead && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pendingAction}
              onClick={onRevokeWaiver}
            >
              {pendingAction ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Revoke waiver
            </Button>
            <Button
              size="sm"
              disabled={pendingAction}
              onClick={onComplete}
            >
              <CheckCircle2 className="h-4 w-4" /> Mark complete
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (!isLead) {
    return (
      <p className="text-sm text-muted-foreground">
        Only a lead assessor can mark this item complete or grant a waiver.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={pendingAction} onClick={onComplete}>
        {pendingAction ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Mark complete
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onWaive}
        disabled={pendingAction}
      >
        <ShieldOff className="h-4 w-4" /> Waive this item
      </Button>
    </div>
  )
}

export function ReadinessItemDetail({
  engagementId,
  item,
  auditEntries,
  isLead,
  currentUserEmail,
  pendingAction,
  onComplete,
  onReopen,
  onWaive,
  onRevokeWaiver,
  onArtifactsChanged,
}: ReadinessItemDetailProps): React.ReactElement {
  const def = READINESS_ITEM_DEFINITIONS[item.itemKey]
  const [showAllActivity, setShowAllActivity] = useState(false)

  const itemActivity = auditEntries.filter((e) => e.itemId === item.id)
  const visibleActivity = showAllActivity
    ? itemActivity
    : itemActivity.slice(0, ACTIVITY_PREVIEW_COUNT)

  const canDelete = (a: ReadinessArtifact): boolean =>
    isLead || a.uploadedByEmail === currentUserEmail

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{def.title}</h2>
          <p className="text-sm text-muted-foreground">
            Typical artifact: {def.defaultArtifactDescription}
          </p>
        </div>
        <StatusBadge item={item} />
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Artifacts</CardTitle>
        </CardHeader>
        <CardContent>
          {item.status === 'waived' ? (
            <p className="text-sm text-muted-foreground">
              Artifact uploads are hidden while this item is waived. Revoke
              the waiver to add or remove artifacts.
            </p>
          ) : (
            <ArtifactUpload
              engagementId={engagementId}
              itemKey={item.itemKey}
              artifacts={item.artifacts}
              canDelete={canDelete}
              onChange={onArtifactsChanged}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <CompletionBlock
            item={item}
            isLead={isLead}
            pendingAction={pendingAction}
            onComplete={onComplete}
            onReopen={onReopen}
            onWaive={onWaive}
            onRevokeWaiver={onRevokeWaiver}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" aria-hidden /> Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {itemActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {visibleActivity.map((e) => {
                const when = safeDate(e.createdAt)
                const relative = when
                  ? formatDistanceToNow(when, { addSuffix: true })
                  : ''
                const detail = auditDetail(e)
                return (
                  <li
                    key={e.id}
                    className="flex items-start gap-2 text-sm"
                    data-testid="activity-entry"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{e.actorName}</span>{' '}
                      <span className="text-muted-foreground">
                        {auditLabel(e.action).toLowerCase()}
                      </span>
                      {detail && (
                        <span className="text-muted-foreground"> · {detail}</span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relative}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          {itemActivity.length > ACTIVITY_PREVIEW_COUNT && (
            <div className="mt-3">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowAllActivity((v) => !v)}
              >
                {showAllActivity
                  ? 'Show fewer'
                  : `Show all (${itemActivity.length})`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
