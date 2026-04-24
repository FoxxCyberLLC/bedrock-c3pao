/**
 * @vitest-environment jsdom
 *
 * Behavioral tests for <CompletedEngagementSummary> — the read-only view
 * rendered when the COMPLETED short-circuit fires (minimal-payload bailout).
 * Verifies the determination label and the always-present Export button.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompletedEngagementSummary } from '@/components/c3pao/completed-engagement-summary'

describe('CompletedEngagementSummary', () => {
  it('renders the Final Level 2 label for FINAL_LEVEL_2 result', () => {
    render(
      <CompletedEngagementSummary
        engagement={{ id: 'eng-1', status: 'COMPLETED', assessmentResult: 'FINAL_LEVEL_2' }}
      />,
    )
    expect(screen.getByText(/final level 2/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /export to emass/i })).toBeInTheDocument()
  })

  it('renders the Conditional Level 2 label for CONDITIONAL_LEVEL_2 result', () => {
    render(
      <CompletedEngagementSummary
        engagement={{
          id: 'eng-1',
          status: 'COMPLETED',
          assessmentResult: 'CONDITIONAL_LEVEL_2',
        }}
      />,
    )
    expect(screen.getByText(/conditional level 2/i)).toBeInTheDocument()
  })

  it('renders the No CMMC Status label for NO_CMMC_STATUS result', () => {
    render(
      <CompletedEngagementSummary
        engagement={{
          id: 'eng-1',
          status: 'COMPLETED',
          assessmentResult: 'NO_CMMC_STATUS',
        }}
      />,
    )
    expect(screen.getByText(/no cmmc status/i)).toBeInTheDocument()
  })

  it('renders Result Not Recorded when assessmentResult is missing (legacy minimal payload)', () => {
    render(
      <CompletedEngagementSummary
        engagement={{ id: 'eng-1', status: 'COMPLETED' }}
      />,
    )
    expect(screen.getByText(/result not recorded/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /export to emass/i })).toBeInTheDocument()
  })
})
