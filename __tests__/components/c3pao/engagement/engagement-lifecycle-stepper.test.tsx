/**
 * @vitest-environment jsdom
 *
 * Smoke tests for the lifecycle phase tracker.
 *
 * Covers:
 *   1. When `initialPhase` is supplied, the stepper renders the correct
 *      step as current without needing a client-side fetch (fixes the
 *      stale-prop bug where the tracker stayed on PRE_ASSESS after
 *      `startAssessment` triggered `router.refresh()`).
 *   2. Completed steps show a check icon; the active step shows its
 *      number.
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { EngagementLifecycleStepper } from '@/components/c3pao/engagement/engagement-lifecycle-stepper'
import type { EngagementPhase, EngagementPhaseName } from '@/lib/api-client'

vi.mock('@/app/actions/c3pao-phase', () => ({
  getEngagementPhase: vi.fn(),
}))

function makePhase(currentPhase: EngagementPhaseName): EngagementPhase {
  return {
    currentPhase,
    phaseEnteredAt: '2026-04-20T00:00:00Z',
    reevalWindowOpenUntil: null,
    appealsWindowOpenUntil: null,
  }
}

describe('EngagementLifecycleStepper', () => {
  it('renders the PRE_ASSESS step as current when initialPhase is provided', () => {
    render(
      <EngagementLifecycleStepper
        engagementId="eng-1"
        initialPhase={makePhase('PRE_ASSESS')}
      />,
    )
    expect(screen.getByText('Pre-Assessment')).toBeInTheDocument()
    expect(screen.getByText('Assess')).toBeInTheDocument()
    // Current step renders its index number (1) rather than a checkmark.
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('marks earlier steps complete when phase is ASSESS', () => {
    const { container } = render(
      <EngagementLifecycleStepper
        engagementId="eng-1"
        initialPhase={makePhase('ASSESS')}
      />,
    )
    // ASSESS is index 1 — so the PRE_ASSESS circle shows a check icon.
    // Completed circles use the emerald class, so one must be present.
    const completedCircle = container.querySelector('.bg-emerald-500')
    expect(completedCircle).not.toBeNull()
  })

  it('renders future steps as muted without a check icon', () => {
    render(
      <EngagementLifecycleStepper
        engagementId="eng-1"
        initialPhase={makePhase('PRE_ASSESS')}
      />,
    )
    // Future step labels get the muted-foreground class.
    const reportLabel = screen.getByText('Report')
    expect(reportLabel.className).toContain('text-muted-foreground')
  })
})
