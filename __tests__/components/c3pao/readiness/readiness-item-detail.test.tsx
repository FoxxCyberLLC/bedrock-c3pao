/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/app/actions/c3pao-readiness', () => ({
  uploadArtifact: vi.fn(),
  removeArtifact: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { ReadinessItemDetail } from '@/components/c3pao/readiness/readiness-item-detail'
import type {
  AuditEntry,
  ReadinessItem,
  ReadinessItemStatus,
} from '@/lib/readiness-types'

function makeItem(
  status: ReadinessItemStatus,
  extra: Partial<ReadinessItem> = {},
): ReadinessItem {
  return {
    id: 'item-1',
    engagementId: 'eng-1',
    itemKey: 'contract_executed',
    status,
    completedBy: null,
    completedByEmail: null,
    completedAt: null,
    waivedBy: null,
    waivedByEmail: null,
    waivedAt: null,
    waiverReason: null,
    updatedAt: '2026-04-22T00:00:00Z',
    artifacts: [],
    ...extra,
  }
}

const noop = () => {}
const commonCallbacks = {
  onComplete: noop,
  onReopen: noop,
  onWaive: noop,
  onRevokeWaiver: noop,
}

describe('ReadinessItemDetail', () => {
  it('shows Mark complete + Waive buttons for lead on a not-started item', () => {
    render(
      <ReadinessItemDetail
        engagementId="e1"
        item={makeItem('not_started')}
        auditEntries={[]}
        isLead
        currentUserEmail="me@x.com"
        {...commonCallbacks}
      />,
    )
    expect(
      screen.getByRole('button', { name: /Mark complete/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Waive this item/i }),
    ).toBeInTheDocument()
  })

  it('hides action buttons for non-lead and shows guidance text', () => {
    render(
      <ReadinessItemDetail
        engagementId="e1"
        item={makeItem('not_started')}
        auditEntries={[]}
        isLead={false}
        currentUserEmail="me@x.com"
        {...commonCallbacks}
      />,
    )
    expect(
      screen.queryByRole('button', { name: /Mark complete/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/Only a lead assessor can mark this item complete/i),
    ).toBeInTheDocument()
  })

  it('shows Re-open button when item is complete (lead)', () => {
    render(
      <ReadinessItemDetail
        engagementId="e1"
        item={makeItem('complete', {
          completedBy: 'L. Chen',
          completedAt: '2026-04-19T00:00:00Z',
        })}
        auditEntries={[]}
        isLead
        currentUserEmail="me@x.com"
        {...commonCallbacks}
      />,
    )
    expect(screen.getByRole('button', { name: /Re-open/i })).toBeInTheDocument()
    expect(screen.getByText(/L\. Chen/)).toBeInTheDocument()
  })

  it('renders waiver reason and Revoke when item is waived (lead)', () => {
    render(
      <ReadinessItemDetail
        engagementId="e1"
        item={makeItem('waived', {
          waivedBy: 'L. Chen',
          waiverReason: 'Contract pending legal review this quarter',
        })}
        auditEntries={[]}
        isLead
        currentUserEmail="me@x.com"
        {...commonCallbacks}
      />,
    )
    expect(
      screen.getByText(/Contract pending legal review this quarter/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Revoke waiver/i }),
    ).toBeInTheDocument()
  })

  it('renders activity entries scoped to the item', () => {
    const entries: AuditEntry[] = [
      {
        id: 'a1',
        engagementId: 'eng-1',
        itemId: 'item-1',
        actorId: 'u1',
        actorEmail: 'jane@x.com',
        actorName: 'Jane',
        action: 'artifact_uploaded',
        details: { filename: 'signed.pdf' },
        createdAt: '2026-04-20T00:00:00Z',
      },
      {
        id: 'a2',
        engagementId: 'eng-1',
        itemId: 'other-item',
        actorId: 'u2',
        actorEmail: 'joe@x.com',
        actorName: 'Joe',
        action: 'item_completed',
        details: null,
        createdAt: '2026-04-20T00:00:00Z',
      },
    ]
    render(
      <ReadinessItemDetail
        engagementId="e1"
        item={makeItem('in_progress')}
        auditEntries={entries}
        isLead
        currentUserEmail="me@x.com"
        {...commonCallbacks}
      />,
    )
    const rows = screen.getAllByTestId('activity-entry')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Jane')
    expect(rows[0]).toHaveTextContent('signed.pdf')
  })

  it('hides the artifact upload when item is waived', () => {
    render(
      <ReadinessItemDetail
        engagementId="e1"
        item={makeItem('waived', {
          waivedBy: 'L. Chen',
          waiverReason: 'Standing COI register already on file in our system',
        })}
        auditEntries={[]}
        isLead
        currentUserEmail="me@x.com"
        {...commonCallbacks}
      />,
    )
    expect(
      screen.getByText(/Artifact uploads are hidden while this item is waived/i),
    ).toBeInTheDocument()
  })
})
