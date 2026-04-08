'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { CheckCircle2, Clock, ExternalLink, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { safeDate, cn } from '@/lib/utils'
import { updateQAReviewAction } from '@/app/actions/c3pao-qa'
import type { QAReview, QAReviewStatus } from '@/lib/api-client'

const STATUS_BADGE: Record<QAReviewStatus, string> = {
  PENDING:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  IN_REVIEW:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  APPROVED:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  NEEDS_REVISION:
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
  REJECTED:
    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
}

const KIND_LABEL: Record<string, string> = {
  PRE_ASSESS_FORM: 'Pre-Assessment Form',
  FINAL_REPORT: 'Final Report',
}

interface QAQueueTableProps {
  initialReviews: QAReview[]
}

export function QAQueueTable({ initialReviews }: QAQueueTableProps) {
  const [reviews, setReviews] = useState<QAReview[]>(initialReviews)
  const [selected, setSelected] = useState<QAReview | null>(null)
  const [newStatus, setNewStatus] = useState<QAReviewStatus>('IN_REVIEW')
  const [newNotes, setNewNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const openDialog = (review: QAReview) => {
    setSelected(review)
    setNewStatus(review.status)
    setNewNotes(review.notes ?? '')
  }

  const closeDialog = () => {
    setSelected(null)
    setNewStatus('IN_REVIEW')
    setNewNotes('')
  }

  const handleSubmit = () => {
    if (!selected) return
    startTransition(async () => {
      const result = await updateQAReviewAction(selected.id, {
        status: newStatus,
        notes: newNotes || undefined,
      })
      if (result.success && result.data) {
        setReviews((prev) =>
          prev.map((r) => (r.id === selected.id ? result.data! : r)),
        )
        toast.success(`QA review marked ${newStatus.toLowerCase().replace('_', ' ')}`)
        closeDialog()
      } else {
        toast.error(result.error ?? 'Failed to update QA review')
      }
    })
  }

  if (reviews.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No QA reviews in the queue.
      </p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Engagement</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Reviewer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned</TableHead>
            <TableHead className="w-[140px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.map((r) => {
            const assigned = safeDate(r.assignedAt)
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <Link
                    href={`/engagements/${r.engagementId}`}
                    className="group inline-flex items-center gap-1.5 font-medium hover:text-primary"
                  >
                    {r.organizationName ?? 'Unknown'}
                    <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {r.engagementName ?? r.engagementId}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {KIND_LABEL[r.kind] ?? r.kind}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {r.assignedToName ?? r.assignedToId}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(STATUS_BADGE[r.status])}>
                    {r.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground tabular-nums">
                  {assigned
                    ? formatDistanceToNow(assigned, { addSuffix: true })
                    : '—'}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openDialog(r)}
                  >
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Review: {selected ? KIND_LABEL[selected.kind] : ''}
            </DialogTitle>
            <DialogDescription>
              {selected && (
                <>
                  {selected.organizationName ?? 'Unknown'} ·{' '}
                  {selected.engagementName ?? selected.engagementId}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={newStatus}
                onValueChange={(v) => setNewStatus(v as QAReviewStatus)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_REVIEW">In Review</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="NEEDS_REVISION">Needs Revision</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={4}
                placeholder="Reviewer notes..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
