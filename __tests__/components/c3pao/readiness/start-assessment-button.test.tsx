/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/app/actions/c3pao-readiness', () => ({
  startAssessment: vi.fn(),
}))
const routerRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { StartAssessmentButton } from '@/components/c3pao/readiness/start-assessment-button'
import * as actions from '@/app/actions/c3pao-readiness'
import { toast } from 'sonner'

describe('StartAssessmentButton', () => {
  beforeEach(() => {
    vi.mocked(actions.startAssessment).mockReset()
    vi.mocked(toast.success).mockReset()
    vi.mocked(toast.error).mockReset()
    routerRefresh.mockReset()
  })

  it('is disabled with helper text when not ready', () => {
    render(
      <StartAssessmentButton
        engagementId="e1"
        canStart={false}
        isLead
        progress={{ completed: 3, total: 8 }}
      />,
    )
    expect(screen.getByTestId('start-assessment-button')).toBeDisabled()
    expect(
      screen.getByText(/Complete all 8 items to unlock \(3\/8\)/i),
    ).toBeInTheDocument()
  })

  it('is disabled for non-lead users even at 8/8', () => {
    render(
      <StartAssessmentButton
        engagementId="e1"
        canStart={true}
        isLead={false}
        progress={{ completed: 8, total: 8 }}
      />,
    )
    expect(screen.getByTestId('start-assessment-button')).toBeDisabled()
    expect(
      screen.getByText(/Only the lead assessor can start the assessment/i),
    ).toBeInTheDocument()
  })

  it('enables when lead and ready', () => {
    render(
      <StartAssessmentButton
        engagementId="e1"
        canStart={true}
        isLead
        progress={{ completed: 8, total: 8 }}
      />,
    )
    expect(screen.getByTestId('start-assessment-button')).not.toBeDisabled()
  })

  it('calls startAssessment and refreshes on success', async () => {
    vi.mocked(actions.startAssessment).mockResolvedValue({ success: true })
    render(
      <StartAssessmentButton
        engagementId="eng-42"
        canStart={true}
        isLead
        progress={{ completed: 8, total: 8 }}
      />,
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-assessment-button'))
    })
    expect(actions.startAssessment).toHaveBeenCalledWith('eng-42')
    expect(routerRefresh).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalled()
  })

  it('shows an error toast when server action fails', async () => {
    vi.mocked(actions.startAssessment).mockResolvedValue({
      success: false,
      error: 'Forbidden: lead assessor required',
    })
    render(
      <StartAssessmentButton
        engagementId="eng-42"
        canStart={true}
        isLead
        progress={{ completed: 8, total: 8 }}
      />,
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-assessment-button'))
    })
    expect(toast.error).toHaveBeenCalledWith(
      'Forbidden: lead assessor required',
    )
  })
})
