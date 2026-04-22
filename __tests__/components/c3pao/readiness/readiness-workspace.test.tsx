/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/app/actions/c3pao-readiness', () => ({
  ensureEngagementInPlanPhase: vi.fn(),
  getReadinessChecklist: vi.fn(),
  getReadinessAuditLog: vi.fn(),
  completeItem: vi.fn(),
  uncompleteItem: vi.fn(),
  grantWaiver: vi.fn(),
  revokeWaiver: vi.fn(),
  startAssessment: vi.fn(),
  uploadArtifact: vi.fn(),
  removeArtifact: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { ReadinessWorkspace } from '@/components/c3pao/readiness/readiness-workspace'
import * as actions from '@/app/actions/c3pao-readiness'
import { READINESS_ITEM_KEYS } from '@/lib/readiness-types'
import type {
  ReadinessChecklist,
  ReadinessItem,
} from '@/lib/readiness-types'

function buildChecklist(): ReadinessChecklist {
  const items: ReadinessItem[] = READINESS_ITEM_KEYS.map((k) => ({
    id: `id-${k}`,
    engagementId: 'eng-1',
    itemKey: k,
    status: 'not_started',
    completedBy: null,
    completedByEmail: null,
    completedAt: null,
    waivedBy: null,
    waivedByEmail: null,
    waivedAt: null,
    waiverReason: null,
    updatedAt: '2026-04-22T00:00:00Z',
    artifacts: [],
  }))
  return {
    engagementId: 'eng-1',
    items,
    completedCount: 0,
    totalCount: 8,
    canStart: false,
  }
}

describe('ReadinessWorkspace', () => {
  beforeEach(() => {
    vi.mocked(actions.ensureEngagementInPlanPhase).mockResolvedValue({
      success: true,
    })
    vi.mocked(actions.completeItem).mockResolvedValue({
      success: true,
    } as never)
    vi.mocked(actions.getReadinessChecklist).mockResolvedValue({
      success: true,
      data: buildChecklist(),
    })
    vi.mocked(actions.getReadinessAuditLog).mockResolvedValue({
      success: true,
      data: [],
    })
  })

  it('renders the heading, 8 items, and disabled Start Assessment button', async () => {
    render(
      <ReadinessWorkspace
        engagementId="eng-1"
        initialChecklist={buildChecklist()}
        initialAuditEntries={[]}
        isLead
        currentUserEmail="me@x.com"
      />,
    )
    await act(async () => {})
    expect(
      screen.getByRole('heading', { name: /Pre-Assessment Readiness/i }),
    ).toBeInTheDocument()
    // "Contract Executed" appears in the list and in the detail heading.
    expect(screen.getAllByText('Contract Executed').length).toBeGreaterThan(0)
    expect(screen.getByTestId('start-assessment-button')).toBeDisabled()
  })

  it('fires ensureEngagementInPlanPhase on mount', async () => {
    render(
      <ReadinessWorkspace
        engagementId="eng-mount"
        initialChecklist={buildChecklist()}
        initialAuditEntries={[]}
        isLead
        currentUserEmail="me@x.com"
      />,
    )
    await act(async () => {})
    expect(actions.ensureEngagementInPlanPhase).toHaveBeenCalledWith(
      'eng-mount',
    )
  })

  it('switches detail pane when a different item is selected', async () => {
    render(
      <ReadinessWorkspace
        engagementId="eng-1"
        initialChecklist={buildChecklist()}
        initialAuditEntries={[]}
        isLead
        currentUserEmail="me@x.com"
      />,
    )
    await act(async () => {})
    fireEvent.click(screen.getByTestId('readiness-item-emass_uploaded'))
    expect(
      screen.getByRole('heading', { name: /Uploaded to eMASS/i }),
    ).toBeInTheDocument()
  })

  it('calls completeItem for the selected item when Mark complete is clicked', async () => {
    render(
      <ReadinessWorkspace
        engagementId="eng-1"
        initialChecklist={buildChecklist()}
        initialAuditEntries={[]}
        isLead
        currentUserEmail="me@x.com"
      />,
    )
    await act(async () => {})
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Mark complete/i }))
    })
    expect(actions.completeItem).toHaveBeenCalledWith(
      'eng-1',
      'contract_executed',
    )
  })
})
