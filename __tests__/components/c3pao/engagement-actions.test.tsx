/**
 * @vitest-environment jsdom
 *
 * Behavioral tests for <EngagementActions> — the phase-driven action bar.
 * Each `it` block verifies which buttons are visible for a given
 * (phase × status × role) combination per the CAP v2.0 mapping.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EngagementActions } from '@/components/c3pao/engagement-actions'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const baseEngagement = {
  id: 'eng-1',
  status: 'IN_PROGRESS' as const,
  assessmentType: 'CERTIFICATION',
  assessmentModeActive: false,
  assessmentResult: null,
  leadAssessor: { id: 'lead-1' },
  atoPackage: {
    name: 'Pkg',
    organization: { name: 'Acme' },
  },
}

const leadUser = { id: 'lead-1', isLeadAssessor: true }
const nonLeadUser = { id: 'nl-1', isLeadAssessor: false }

const baseStats = {
  total: 110,
  compliant: 100,
  nonCompliant: 5,
  inProgress: 0,
  notStarted: 0,
  notApplicable: 5,
}

const assignedTeam = [{ assessorId: 'nl-1', role: 'ASSESSOR' as const }]

describe('EngagementActions — phase-driven visibility', () => {
  it('PRE_ASSESS / REQUESTED — shows Accept Request and Decline only', () => {
    render(
      <EngagementActions
        engagement={{ ...baseEngagement, status: 'REQUESTED' }}
        user={leadUser}
        team={[]}
        currentPhase={null}
        autoDetectedStatus={null}
        controlStats={baseStats}
      />,
    )
    expect(screen.getByRole('button', { name: /accept request/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /decline request/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start assessment/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^stop assessment$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /complete assessment/i })).not.toBeInTheDocument()
  })

  it('PRE_ASSESS / ACCEPTED — Cancel only; Start Assessment lives in the readiness workspace, not the action bar', () => {
    render(
      <EngagementActions
        engagement={{ ...baseEngagement, status: 'ACCEPTED' }}
        user={leadUser}
        team={[]}
        currentPhase={null}
        autoDetectedStatus={null}
        controlStats={baseStats}
      />,
    )
    expect(screen.getByRole('button', { name: /cancel engagement/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start assessment/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /accept request/i })).not.toBeInTheDocument()
  })

  it('ASSESS / IN_PROGRESS / lead / mode active — Stop, Complete, and Cancel; not Submit', () => {
    render(
      <EngagementActions
        engagement={{ ...baseEngagement, status: 'IN_PROGRESS', assessmentModeActive: true }}
        user={leadUser}
        team={[{ assessorId: 'lead-1', role: 'LEAD' }]}
        currentPhase={null}
        autoDetectedStatus={null}
        controlStats={baseStats}
      />,
    )
    expect(screen.getByRole('button', { name: /^stop assessment$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /complete assessment/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel assessment/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit for approval/i })).not.toBeInTheDocument()
  })

  it('ASSESS / IN_PROGRESS / non-lead assigned — Submit and Cancel; not Stop or Complete', () => {
    render(
      <EngagementActions
        engagement={{ ...baseEngagement, status: 'IN_PROGRESS', assessmentModeActive: true }}
        user={nonLeadUser}
        team={assignedTeam}
        currentPhase={null}
        autoDetectedStatus={null}
        controlStats={baseStats}
      />,
    )
    expect(screen.getByRole('button', { name: /submit for approval/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel assessment/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^stop assessment$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /complete assessment/i })).not.toBeInTheDocument()
  })

  it('ASSESS / AWAITING_OSC_CORRECTIONS / lead — Resume Re-Evaluation only', () => {
    render(
      <EngagementActions
        engagement={{ ...baseEngagement, status: 'AWAITING_OSC_CORRECTIONS' }}
        user={leadUser}
        team={[]}
        // Phase column may not be set for this row; explicit ASSESS to make it deterministic.
        currentPhase="ASSESS"
        autoDetectedStatus={null}
        controlStats={baseStats}
      />,
    )
    expect(screen.getByRole('button', { name: /resume re-evaluation/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^stop assessment$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit for approval/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /complete assessment/i })).not.toBeInTheDocument()
  })

  it('REPORT / PENDING_APPROVAL / lead — Complete, Send Back, and Cancel', () => {
    render(
      <EngagementActions
        engagement={{ ...baseEngagement, status: 'PENDING_APPROVAL' }}
        user={leadUser}
        team={[{ assessorId: 'lead-1', role: 'LEAD' }]}
        currentPhase={null}
        autoDetectedStatus={null}
        controlStats={baseStats}
      />,
    )
    expect(screen.getByRole('button', { name: /complete assessment/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send back/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel assessment/i })).toBeInTheDocument()
  })

  it('REPORT / COMPLETED — Export to eMASS only (no Cancel)', () => {
    render(
      <EngagementActions
        engagement={{ ...baseEngagement, status: 'COMPLETED' }}
        user={leadUser}
        team={[]}
        // Phase column may be REPORT (Final Level 2) for COMPLETED.
        currentPhase="REPORT"
        autoDetectedStatus={null}
        controlStats={baseStats}
      />,
    )
    expect(screen.getByRole('link', { name: /export to emass/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('CLOSE_OUT — Export to eMASS only', () => {
    render(
      <EngagementActions
        engagement={{ ...baseEngagement, status: 'COMPLETED', assessmentResult: 'CONDITIONAL_LEVEL_2' }}
        user={leadUser}
        team={[]}
        currentPhase="CLOSE_OUT"
        autoDetectedStatus={null}
        controlStats={baseStats}
      />,
    )
    expect(screen.getByRole('link', { name: /export to emass/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /complete/i })).not.toBeInTheDocument()
  })
})
