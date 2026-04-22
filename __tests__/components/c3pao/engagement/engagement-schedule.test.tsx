/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/app/actions/c3pao-schedule', () => ({
  getEngagementSchedule: vi.fn(),
  updateEngagementSchedule: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { EngagementSchedule } from '@/components/c3pao/engagement/engagement-schedule'
import * as actions from '@/app/actions/c3pao-schedule'
import type { EngagementSchedule as EngagementScheduleData } from '@/lib/db-schedule'

function emptySchedule(): EngagementScheduleData {
  return {
    engagementId: 'eng-1',
    kickoffDate: null,
    onsiteStart: null,
    onsiteEnd: null,
    interviewSchedule: null,
    deliverableDueDates: null,
    phase1Target: null,
    phase2Target: null,
    phase3Target: null,
    locationNotes: null,
    updatedAt: '2026-04-22T00:00:00Z',
    updatedBy: null,
  }
}

describe('EngagementSchedule', () => {
  beforeEach(() => {
    vi.mocked(actions.getEngagementSchedule).mockReset()
    vi.mocked(actions.updateEngagementSchedule).mockReset()
    vi.mocked(actions.getEngagementSchedule).mockResolvedValue({
      success: true,
      data: emptySchedule(),
    })
  })

  it('renders the form with textareas for leads', async () => {
    render(
      <EngagementSchedule
        engagementId="eng-1"
        initialSchedule={emptySchedule()}
        isLead
      />,
    )
    await act(async () => {})
    expect(screen.getByTestId('schedule-interviewSchedule')).toBeInTheDocument()
    expect(screen.getByTestId('schedule-save-button')).toBeInTheDocument()
  })

  it('renders read-only dl entries for non-leads and hides the save button', async () => {
    render(
      <EngagementSchedule
        engagementId="eng-1"
        initialSchedule={emptySchedule()}
        isLead={false}
      />,
    )
    await act(async () => {})
    expect(
      screen.queryByTestId('schedule-save-button'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/Only the lead assessor can edit the engagement schedule/i),
    ).toBeInTheDocument()
  })

  it('calls updateEngagementSchedule with trimmed patch on save', async () => {
    vi.mocked(actions.updateEngagementSchedule).mockResolvedValue({
      success: true,
      data: { ...emptySchedule(), interviewSchedule: 'Tue 10am' },
    })
    render(
      <EngagementSchedule
        engagementId="eng-1"
        initialSchedule={emptySchedule()}
        isLead
      />,
    )
    await act(async () => {})
    fireEvent.change(screen.getByTestId('schedule-interviewSchedule'), {
      target: { value: '  Tue 10am  ' },
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('schedule-save-button'))
    })
    expect(actions.updateEngagementSchedule).toHaveBeenCalledWith(
      'eng-1',
      expect.objectContaining({ interviewSchedule: 'Tue 10am' }),
    )
  })
})
