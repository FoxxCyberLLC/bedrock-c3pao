/**
 * @vitest-environment jsdom
 *
 * Smoke test for the /team → /engagements?lead=<id> drill-down filter on
 * <EngagementsList>. Verifies that:
 *   - Only matching rows render when initialLeadFilterId is set
 *   - The dismissible chip displays the resolved lead name
 *   - Clicking the chip's × calls router.replace('/engagements')
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EngagementsList } from '@/components/c3pao/engagements/engagements-list'
import type { PortfolioRow } from '@/lib/engagements-list/types'

const replaceMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function buildRow(overrides: Partial<PortfolioRow>): PortfolioRow {
  return {
    id: overrides.id ?? 'r-1',
    packageName: overrides.packageName ?? 'Pkg',
    organizationName: overrides.organizationName ?? 'Org',
    status: 'IN_PROGRESS',
    currentPhase: null,
    leadAssessorId: overrides.leadAssessorId ?? null,
    leadAssessorName: overrides.leadAssessorName ?? null,
    scheduledStartDate: null,
    scheduledEndDate: null,
    daysInPhase: 0,
    objectivesTotal: 110,
    objectivesAssessed: 0,
    assessmentResult: null,
    certStatus: null,
    certExpiresAt: null,
    poamCloseoutDue: null,
    reevalWindowOpenUntil: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    findingsCount: null,
    ...overrides,
  }
}

describe('<EngagementsList> lead filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows only engagements led by the filtered lead and renders the dismissible chip', () => {
    const rows: PortfolioRow[] = [
      buildRow({
        id: 'r-1',
        organizationName: 'Acme',
        packageName: 'Acme-Pkg',
        leadAssessorId: 'abc',
        leadAssessorName: 'Alice',
      }),
      buildRow({
        id: 'r-2',
        organizationName: 'Wonka',
        packageName: 'Wonka-Pkg',
        leadAssessorId: 'xyz',
        leadAssessorName: 'Bob',
      }),
    ]

    render(
      <EngagementsList
        initialItems={rows}
        currentUserId="me"
        leadOptions={[
          ['abc', 'Alice'] as const,
          ['xyz', 'Bob'] as const,
        ]}
        initialLeadFilterId="abc"
        initialLeadFilterName="Alice"
      />,
    )

    // Dismissible chip is present with the resolved name
    const chip = screen.getByTestId('lead-filter-chip')
    expect(chip).toBeInTheDocument()
    expect(chip.textContent).toContain('Alice')

    // Only Alice's engagement shows
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.queryByText('Wonka')).not.toBeInTheDocument()
  })

  it('dismissing the chip calls router.replace and clears the filter', () => {
    const rows: PortfolioRow[] = [
      buildRow({
        id: 'r-1',
        organizationName: 'Acme',
        leadAssessorId: 'abc',
        leadAssessorName: 'Alice',
      }),
      buildRow({
        id: 'r-2',
        organizationName: 'Wonka',
        leadAssessorId: 'xyz',
        leadAssessorName: 'Bob',
      }),
    ]

    render(
      <EngagementsList
        initialItems={rows}
        currentUserId="me"
        leadOptions={[
          ['abc', 'Alice'] as const,
          ['xyz', 'Bob'] as const,
        ]}
        initialLeadFilterId="abc"
        initialLeadFilterName="Alice"
      />,
    )

    const clearBtn = screen.getByLabelText('Clear lead filter')
    fireEvent.click(clearBtn)

    expect(replaceMock).toHaveBeenCalledWith('/engagements')

    // After clearing, both rows should be visible.
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Wonka')).toBeInTheDocument()
  })
})
