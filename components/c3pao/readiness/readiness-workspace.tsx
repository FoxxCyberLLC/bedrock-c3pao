'use client'

/**
 * Top-level client shell for the readiness workspace. Owns the selected
 * item state, orchestrates server actions (complete, re-open, grant /
 * revoke waiver), re-fetches checklist + audit entries after mutations,
 * and renders the two-column layout plus bottom Start Assessment bar.
 */

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import {
  completeItem,
  ensureEngagementInPlanPhase,
  getReadinessAuditLog,
  getReadinessChecklist,
  grantWaiver,
  revokeWaiver,
  uncompleteItem,
} from '@/app/actions/c3pao-readiness'
import type {
  AuditEntry,
  ReadinessChecklist,
  ReadinessItem,
  ReadinessItemKey,
} from '@/lib/readiness-types'

import { ReadinessItemDetail } from './readiness-item-detail'
import { ReadinessItemList } from './readiness-item-list'
import { StartAssessmentButton } from './start-assessment-button'
import { WaiverDialog } from './waiver-dialog'

export interface ReadinessWorkspaceProps {
  engagementId: string
  initialChecklist: ReadinessChecklist
  initialAuditEntries: AuditEntry[]
  isLead: boolean
  currentUserEmail: string
}

export function ReadinessWorkspace({
  engagementId,
  initialChecklist,
  initialAuditEntries,
  isLead,
  currentUserEmail,
}: ReadinessWorkspaceProps): React.ReactElement {
  const [checklist, setChecklist] = useState<ReadinessChecklist>(initialChecklist)
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(initialAuditEntries)
  const [selectedKey, setSelectedKey] = useState<ReadinessItemKey>(
    initialChecklist.items[0]?.itemKey ?? 'contract_executed',
  )
  const [waiverOpen, setWaiverOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    // Fire-and-forget: ensure the engagement is initialized to the PLAN
    // (PRE_ASSESS) phase so the later PLAN → ASSESS transition succeeds.
    ensureEngagementInPlanPhase(engagementId).catch(() => {
      // Non-fatal: the server already logs; don't nag the user on mount.
    })
  }, [engagementId])

  const selectedItem: ReadinessItem | undefined = checklist.items.find(
    (i) => i.itemKey === selectedKey,
  )

  async function refresh(): Promise<void> {
    const [c, a] = await Promise.all([
      getReadinessChecklist(engagementId),
      getReadinessAuditLog(engagementId),
    ])
    if (c.success && c.data) setChecklist(c.data)
    if (a.success && a.data) setAuditEntries(a.data)
  }

  function runAction(
    fn: () => Promise<{ success: boolean; error?: string }>,
    successMsg: string,
  ): void {
    startTransition(async () => {
      const result = await fn()
      if (result.success) {
        toast.success(successMsg)
        await refresh()
      } else {
        toast.error(result.error ?? 'Action failed')
      }
    })
  }

  function handleComplete(): void {
    runAction(() => completeItem(engagementId, selectedKey), 'Item marked complete')
  }

  function handleReopen(): void {
    runAction(() => uncompleteItem(engagementId, selectedKey), 'Item re-opened')
  }

  function handleWaive(): void {
    setWaiverOpen(true)
  }

  function handleRevokeWaiver(): void {
    runAction(() => revokeWaiver(engagementId, selectedKey), 'Waiver revoked')
  }

  async function handleGrantWaiver(reason: string): Promise<void> {
    startTransition(async () => {
      const result = await grantWaiver(engagementId, selectedKey, reason)
      if (result.success) {
        toast.success('Waiver granted')
        setWaiverOpen(false)
        await refresh()
      } else {
        toast.error(result.error ?? 'Failed to grant waiver')
      }
    })
  }

  return (
    <section
      className="flex flex-col gap-6"
      aria-labelledby="readiness-workspace-heading"
    >
      <header>
        <h2
          id="readiness-workspace-heading"
          className="text-xl font-semibold"
        >
          Pre-Assessment Readiness
        </h2>
        <p className="text-sm text-muted-foreground">
          Complete or waive all 8 items before starting the assessment.
          Every change is captured in the audit trail.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(18rem,22rem)_1fr]">
        <aside className="md:sticky md:top-4 md:self-start">
          <ReadinessItemList
            items={checklist.items}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            progress={{
              completed: checklist.completedCount,
              total: checklist.totalCount,
            }}
          />
        </aside>
        <div>
          {selectedItem ? (
            <ReadinessItemDetail
              engagementId={engagementId}
              item={selectedItem}
              auditEntries={auditEntries}
              isLead={isLead}
              currentUserEmail={currentUserEmail}
              pendingAction={pending}
              onComplete={handleComplete}
              onReopen={handleReopen}
              onWaive={handleWaive}
              onRevokeWaiver={handleRevokeWaiver}
              onArtifactsChanged={refresh}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select an item from the list to view details.
            </p>
          )}
        </div>
      </div>

      <div className="border-t pt-4">
        <StartAssessmentButton
          engagementId={engagementId}
          canStart={checklist.canStart}
          isLead={isLead}
          progress={{
            completed: checklist.completedCount,
            total: checklist.totalCount,
          }}
        />
      </div>

      <WaiverDialog
        open={waiverOpen}
        onOpenChange={setWaiverOpen}
        itemKey={selectedKey}
        onSubmit={handleGrantWaiver}
        pending={pending}
      />
    </section>
  )
}
