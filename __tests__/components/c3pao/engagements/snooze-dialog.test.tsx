/**
 * @vitest-environment jsdom
 *
 * Behavioral tests for <SnoozeDialog>. Verifies:
 *   - Default quick-pick is "1 week"
 *   - Selecting a quick-pick resolves to a date that many days out (approx)
 *   - Optional reason is forwarded only when non-empty
 *   - Failure response keeps the dialog open
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/app/actions/c3pao-personal-views', () => ({
  snoozeEngagement: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { SnoozeDialog } from '@/components/c3pao/engagements/snooze-dialog'
import { snoozeEngagement } from '@/app/actions/c3pao-personal-views'

const MS_PER_DAY = 86_400_000
function approxDaysAhead(iso: string, expectedDays: number, toleranceDays = 0.5): boolean {
  const delta = (new Date(iso).getTime() - Date.now()) / MS_PER_DAY
  return Math.abs(delta - expectedDays) <= toleranceDays
}

function renderDialog(overrides: Partial<Parameters<typeof SnoozeDialog>[0]> = {}) {
  const onOpenChange = vi.fn()
  const onSuccess = vi.fn()
  const props = {
    open: true,
    onOpenChange,
    engagementId: 'eng-1',
    engagementLabel: 'Acme Co',
    onSuccess,
    ...overrides,
  }
  const utils = render(<SnoozeDialog {...props} />)
  return { ...utils, onOpenChange, onSuccess }
}

describe('<SnoozeDialog>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the engagement label in the description', () => {
    renderDialog({ engagementLabel: 'Globex Corp' })
    expect(screen.getByText('Globex Corp')).toBeInTheDocument()
  })

  it('defaults the selected duration to 1 week', () => {
    renderDialog()
    const week = screen.getByRole('radio', { name: '1 week' })
    expect(week).toHaveAttribute('aria-checked', 'true')
  })

  it('saves with hiddenUntil ~7 days out when 1 week is selected', async () => {
    vi.mocked(snoozeEngagement).mockResolvedValue({ success: true })
    const { onSuccess, onOpenChange } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: /^Snooze$/ }))

    await waitFor(() => expect(snoozeEngagement).toHaveBeenCalled())
    const [engagementId, isoString, reason] = vi.mocked(snoozeEngagement).mock.calls[0]
    expect(engagementId).toBe('eng-1')
    expect(reason).toBeUndefined()
    expect(approxDaysAhead(isoString, 7)).toBe(true)

    expect(onSuccess).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('saves with a different hiddenUntil when 3 days is selected', async () => {
    vi.mocked(snoozeEngagement).mockResolvedValue({ success: true })
    renderDialog()

    fireEvent.click(screen.getByRole('radio', { name: '3 days' }))
    fireEvent.click(screen.getByRole('button', { name: /^Snooze$/ }))

    await waitFor(() => expect(snoozeEngagement).toHaveBeenCalled())
    const [, isoString] = vi.mocked(snoozeEngagement).mock.calls[0]
    expect(approxDaysAhead(isoString, 3)).toBe(true)
  })

  it('forwards the trimmed reason when provided', async () => {
    vi.mocked(snoozeEngagement).mockResolvedValue({ success: true })
    renderDialog()

    const textarea = screen.getByLabelText(/Reason/) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '  waiting on evidence  ' } })

    fireEvent.click(screen.getByRole('button', { name: /^Snooze$/ }))

    await waitFor(() => expect(snoozeEngagement).toHaveBeenCalled())
    const [, , reason] = vi.mocked(snoozeEngagement).mock.calls[0]
    expect(reason).toBe('waiting on evidence')
  })

  it('omits the reason when only whitespace was typed', async () => {
    vi.mocked(snoozeEngagement).mockResolvedValue({ success: true })
    renderDialog()

    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /^Snooze$/ }))

    await waitFor(() => expect(snoozeEngagement).toHaveBeenCalled())
    const [, , reason] = vi.mocked(snoozeEngagement).mock.calls[0]
    expect(reason).toBeUndefined()
  })

  it('does not close the dialog when the action returns failure', async () => {
    vi.mocked(snoozeEngagement).mockResolvedValue({ success: false, error: 'nope' })
    const { onOpenChange } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: /^Snooze$/ }))

    await waitFor(() => expect(snoozeEngagement).toHaveBeenCalled())
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
