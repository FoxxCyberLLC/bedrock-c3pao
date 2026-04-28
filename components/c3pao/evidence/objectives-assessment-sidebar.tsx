'use client'

import { useEffect, useState, useTransition } from 'react'
import { Loader2, Plus, X, FileText } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkEvidenceDialog } from './link-evidence-dialog'
import {
  linkOutsideEvidenceToObjective,
  unlinkOutsideEvidenceFromObjective,
  listOutsideObjectivesForEvidenceAction,
} from '@/app/actions/c3pao-outside-engagement'

export interface LinkedObjective {
  id: string
  reference: string
  status: string
  description: string | null
}

interface ObjectivesAssessmentSidebarProps {
  engagementId: string
  evidenceId: string
  engagementKind: 'osc' | 'outside_osc'
  /** All objectives for this engagement — used to populate the link picker. */
  allObjectives: ReadonlyArray<LinkedObjective>
  /** Initially-linked objective ids. */
  initialLinkedIds: ReadonlyArray<string>
}

const statusToTone: Record<string, string> = {
  MET: 'bg-emerald-500/10 text-emerald-700',
  NOT_MET: 'bg-red-500/10 text-red-700',
  NOT_APPLICABLE: 'bg-gray-500/10 text-gray-700',
  NOT_ASSESSED: 'bg-amber-500/10 text-amber-700',
}

export function ObjectivesAssessmentSidebar({
  engagementId,
  evidenceId,
  engagementKind,
  allObjectives,
  initialLinkedIds,
}: ObjectivesAssessmentSidebarProps) {
  const [linkedIds, setLinkedIds] = useState<ReadonlyArray<string>>(initialLinkedIds)
  const [isPicking, setIsPicking] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Refresh linked ids when the evidence under view changes mid-session.
  // No synchronous setState in the effect body — the only mutation happens
  // inside the async .then() callback in response to external state.
  useEffect(() => {
    if (engagementKind !== 'outside_osc') return
    let cancelled = false
    listOutsideObjectivesForEvidenceAction(engagementId, evidenceId).then((res) => {
      if (cancelled) return
      if (res.success && res.data) setLinkedIds(res.data)
    })
    return () => {
      cancelled = true
    }
  }, [engagementId, evidenceId, engagementKind])

  const linkedObjectives = allObjectives.filter((o) => linkedIds.includes(o.id))

  function onUnlink(objectiveId: string) {
    if (engagementKind !== 'outside_osc') {
      toast.error('Linking from this UI is only supported for outside engagements in v1')
      return
    }
    startTransition(async () => {
      const result = await unlinkOutsideEvidenceFromObjective(
        engagementId,
        evidenceId,
        objectiveId,
      )
      if (!result.success) {
        toast.error(result.error ?? 'Failed to unlink')
        return
      }
      setLinkedIds((prev) => prev.filter((id) => id !== objectiveId))
      toast.success('Objective unlinked')
    })
  }

  function onAddLinks(picked: ReadonlyArray<string>) {
    if (engagementKind !== 'outside_osc') {
      toast.error('Linking from this UI is only supported for outside engagements in v1')
      return
    }
    startTransition(async () => {
      const next = new Set(linkedIds)
      for (const objId of picked) {
        if (next.has(objId)) continue
        const result = await linkOutsideEvidenceToObjective(
          engagementId,
          evidenceId,
          objId,
        )
        if (!result.success) {
          toast.error(result.error ?? `Failed to link ${objId}`)
          return
        }
        next.add(objId)
      }
      setLinkedIds(Array.from(next))
      toast.success(`Linked ${picked.length} objective(s)`)
      setIsPicking(false)
    })
  }

  return (
    <div className="space-y-3">
      {linkedObjectives.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
            <FileText className="mb-2 h-6 w-6 text-muted-foreground/60" aria-hidden />
            <p>No objectives linked to this evidence yet.</p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={() => setIsPicking(true)}
              disabled={isPending}
            >
              <Plus className="mr-1 h-3 w-3" aria-hidden />
              Link to Objectives
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {linkedObjectives.map((obj) => (
            <Card key={obj.id}>
              <CardContent className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium">
                      {obj.reference}
                    </span>
                    <Badge
                      variant="outline"
                      className={statusToTone[obj.status] ?? 'bg-gray-500/10'}
                    >
                      {obj.status.replace('_', ' ').toLowerCase()}
                    </Badge>
                  </div>
                  {obj.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {obj.description}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Unlink ${obj.reference}`}
                  onClick={() => onUnlink(obj.id)}
                  disabled={isPending}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </CardContent>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setIsPicking(true)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Plus className="mr-1 h-3 w-3" aria-hidden />
            )}
            Link more objectives
          </Button>
        </div>
      )}

      <LinkEvidenceDialog
        open={isPicking}
        onOpenChange={setIsPicking}
        allObjectives={allObjectives}
        alreadyLinkedIds={linkedIds}
        onConfirm={onAddLinks}
        disabled={isPending}
      />
    </div>
  )
}
