'use client'

/**
 * Read-side panel for the OSC's contractor readiness list (CAP v2.0 Phase 1).
 *
 * The OSC maintains a parallel 8-item checklist of deliverables required from
 * the contractor before the assessor can start Phase 2. This panel shows where
 * the contractor stands on each item and lets the lead assessor mark items as
 * confirmed once they've been reviewed.
 */

import { useEffect, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { AlertCircle, CheckCircle2, Circle, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { safeDate } from '@/lib/utils'
import {
  getCustomerReadiness,
  confirmCustomerReadiness,
} from '@/app/actions/c3pao-preassess'
import type {
  CustomerReadinessItem,
  CustomerReadinessItemType,
} from '@/lib/api-client'

interface CustomerReadinessPanelProps {
  engagementId: string
  isLeadAssessor: boolean
}

const ITEM_LABELS: Record<CustomerReadinessItemType, { title: string; description: string }> = {
  FINAL_SSP: {
    title: 'Final System Security Plan',
    description: 'Contractor has published the approved SSP for assessor review.',
  },
  ASSESSMENT_SCOPE_CONFIRMED: {
    title: 'Assessment Scope Confirmed',
    description: 'Contractor has confirmed the boundary and scope for this assessment.',
  },
  ASSET_INVENTORY: {
    title: 'Asset Inventory',
    description: 'Complete asset inventory uploaded and classified.',
  },
  NETWORK_DIAGRAMS: {
    title: 'Network Diagrams',
    description: 'Current network architecture diagrams uploaded.',
  },
  DATA_FLOW_DIAGRAMS: {
    title: 'Data Flow Diagrams',
    description: 'CUI data-flow diagrams uploaded showing boundaries.',
  },
  POLICIES_PROCEDURES: {
    title: 'Policies & Procedures',
    description: 'All required policy and procedure documents uploaded.',
  },
  PRIOR_VALIDATIONS: {
    title: 'Prior Validations',
    description: 'Prior third-party assessments, inheritance evidence, or FedRAMP artifacts provided.',
  },
  PERSONNEL_AVAILABILITY: {
    title: 'Personnel Availability',
    description: 'Interview roster and schedule confirmed.',
  },
}

const ORDER: CustomerReadinessItemType[] = [
  'FINAL_SSP',
  'ASSESSMENT_SCOPE_CONFIRMED',
  'ASSET_INVENTORY',
  'NETWORK_DIAGRAMS',
  'DATA_FLOW_DIAGRAMS',
  'POLICIES_PROCEDURES',
  'PRIOR_VALIDATIONS',
  'PERSONNEL_AVAILABILITY',
]

function statusBadge(status: string): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  switch (status) {
    case 'READY':
      return { label: 'Ready', variant: 'default' }
    case 'IN_PROGRESS':
      return { label: 'In Progress', variant: 'secondary' }
    default:
      return { label: 'Not Started', variant: 'outline' }
  }
}

export function CustomerReadinessPanel({
  engagementId,
  isLeadAssessor,
}: CustomerReadinessPanelProps) {
  const [items, setItems] = useState<CustomerReadinessItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingItem, setPendingItem] = useState<CustomerReadinessItemType | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const result = await getCustomerReadiness(engagementId)
      if (cancelled) return
      if (result.success && result.data) {
        setItems(result.data)
        setError(null)
      } else {
        setError(result.error ?? 'Failed to load contractor readiness')
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [engagementId])

  function handleConfirm(itemType: CustomerReadinessItemType) {
    setPendingItem(itemType)
    startTransition(async () => {
      const result = await confirmCustomerReadiness(engagementId, itemType)
      if (result.success && result.data) {
        setItems((prev) =>
          prev ? prev.map((i) => (i.itemType === itemType ? result.data! : i)) : prev,
        )
        toast.success(`Confirmed: ${ITEM_LABELS[itemType].title}`)
      } else {
        toast.error(result.error ?? 'Failed to confirm readiness item')
      }
      setPendingItem(null)
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !items) {
    return (
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
        <CardContent className="flex items-start gap-3 py-6">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
          <div>
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
              Unable to load contractor readiness
            </p>
            <p className="mt-0.5 text-xs text-orange-800 dark:text-orange-300">
              {error}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const byType = new Map(items.map((i) => [i.itemType, i]))
  const confirmedCount = items.filter((i) => i.c3paoConfirmedAt).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Contractor Readiness</CardTitle>
            <CardDescription>
              OSC-side pre-assessment deliverables. Confirm each item after review.
            </CardDescription>
          </div>
          <Badge variant="outline">
            {confirmedCount} of {ORDER.length} confirmed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {ORDER.map((itemType) => {
          const item = byType.get(itemType) ?? {
            itemType,
            status: 'NOT_STARTED',
          } as CustomerReadinessItem
          const { title, description } = ITEM_LABELS[itemType]
          const status = statusBadge(item.status)
          const confirmed = item.c3paoConfirmedAt !== null && item.c3paoConfirmedAt !== undefined
          const canConfirm = isLeadAssessor && item.status === 'READY' && !confirmed

          return (
            <div
              key={itemType}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3',
                confirmed
                  ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
                  : 'bg-muted/20',
              )}
            >
              <div className="mt-0.5">
                {confirmed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium leading-tight">{title}</p>
                  <Badge variant={status.variant} className="text-xs">
                    {status.label}
                  </Badge>
                  {confirmed && item.c3paoConfirmedAt && (
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">
                      Confirmed {format(safeDate(item.c3paoConfirmedAt) ?? new Date(), 'PP')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{description}</p>
                {item.customerNote && (
                  <p className="text-xs rounded bg-background/60 border px-2 py-1 mt-1 whitespace-pre-wrap">
                    <span className="font-medium">OSC note: </span>
                    {item.customerNote}
                  </p>
                )}
                {item.evidenceUrl && (
                  <a
                    href={item.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View evidence
                  </a>
                )}
              </div>
              <div className="ml-auto">
                {confirmed ? null : (
                  <Button
                    type="button"
                    size="sm"
                    variant={canConfirm ? 'default' : 'outline'}
                    disabled={!canConfirm || pendingItem === itemType}
                    onClick={() => handleConfirm(itemType)}
                    title={
                      !isLeadAssessor
                        ? 'Only the lead assessor can confirm readiness items'
                        : item.status !== 'READY'
                          ? 'Contractor has not marked this item as Ready'
                          : 'Mark this item as reviewed and confirmed'
                    }
                  >
                    {pendingItem === itemType && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    Confirm
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
