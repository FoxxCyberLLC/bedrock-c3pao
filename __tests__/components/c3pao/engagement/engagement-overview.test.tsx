/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { EngagementOverview } from '@/components/c3pao/engagement/engagement-overview'
import type { EngagementSummary } from '@/lib/api-client'

function makeEngagement(
  overrides: Partial<EngagementSummary> = {},
): EngagementSummary {
  return {
    id: 'eng-1',
    customerId: 'cust-1',
    atoPackageId: 'pkg-1',
    c3paoId: 'c3pao-1',
    leadAssessorId: 'u1',
    status: 'IN_PROGRESS',
    accessLevel: 'LEVEL_2',
    targetLevel: 'LEVEL_2',
    requestedDate: '2026-01-01T00:00:00Z',
    acceptedDate: '2026-01-05T00:00:00Z',
    scheduledStartDate: '2026-02-01T00:00:00Z',
    scheduledEndDate: '2026-03-01T00:00:00Z',
    actualStartDate: null,
    actualCompletionDate: null,
    assessmentScope: null,
    assessmentNotes: null,
    assessmentResult: null,
    findingsCount: null,
    poamRequired: null,
    assessmentModeActive: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    packageName: 'Pkg A',
    organizationName: 'Acme Corp',
    leadAssessorName: 'L. Chen',
    ...overrides,
  }
}

describe('EngagementOverview', () => {
  it('renders OSC name, package, and lead assessor', () => {
    render(
      <EngagementOverview
        engagement={makeEngagement()}
        currentPhase="PRE_ASSESS"
        isLead
      />,
    )
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Pkg A')).toBeInTheDocument()
    expect(screen.getByText('L. Chen')).toBeInTheDocument()
    expect(screen.getByText(/PRE ASSESS/i)).toBeInTheDocument()
  })

  it('shows the Export audit bundle button for leads', () => {
    render(
      <EngagementOverview
        engagement={makeEngagement()}
        currentPhase="PRE_ASSESS"
        isLead
      />,
    )
    const el = screen.getByTestId('export-audit-bundle-button')
    expect(el).toBeInTheDocument()
    // `asChild` collapses Button into the inner anchor, so `href` lives on
    // the rendered element itself (or a descendant — check both).
    const href = el.getAttribute('href') ?? el.querySelector('a')?.getAttribute('href')
    expect(href).toBe('/api/c3pao/engagements/eng-1/export-bundle')
  })

  it('hides the Export audit bundle button for non-leads', () => {
    render(
      <EngagementOverview
        engagement={makeEngagement()}
        currentPhase="PRE_ASSESS"
        isLead={false}
      />,
    )
    expect(
      screen.queryByTestId('export-audit-bundle-button'),
    ).not.toBeInTheDocument()
  })
})
