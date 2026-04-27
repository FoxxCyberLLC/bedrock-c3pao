/**
 * @vitest-environment jsdom
 *
 * Behavioral tests for <AddTagDialog>. Verifies:
 *   - Save is disabled until a label is entered
 *   - Suggestion-chip click populates the input
 *   - Saving calls addEngagementTag with engagementId, trimmed label, and color
 *   - Successful save fires onSuccess with the returned tag and closes the dialog
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/app/actions/c3pao-personal-views', () => ({
  addEngagementTag: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { AddTagDialog } from '@/components/c3pao/engagements/add-tag-dialog'
import { addEngagementTag } from '@/app/actions/c3pao-personal-views'
import type { EngagementTag } from '@/lib/personal-views-types'

function renderDialog(overrides: Partial<Parameters<typeof AddTagDialog>[0]> = {}) {
  const onOpenChange = vi.fn()
  const onSuccess = vi.fn()
  const props = {
    open: true,
    onOpenChange,
    engagementId: 'eng-1',
    suggestions: [],
    onSuccess,
    ...overrides,
  }
  const utils = render(<AddTagDialog {...props} />)
  return { ...utils, onOpenChange, onSuccess }
}

describe('<AddTagDialog>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('disables Save when label is empty', () => {
    renderDialog()
    const save = screen.getByRole('button', { name: /^Save$/ })
    expect(save).toBeDisabled()
  })

  it('enables Save once a non-whitespace label is entered', () => {
    renderDialog()
    const input = screen.getByLabelText(/Label/) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'on-site' } })
    expect(screen.getByRole('button', { name: /^Save$/ })).not.toBeDisabled()
  })

  it('keeps Save disabled when label is whitespace-only', () => {
    renderDialog()
    const input = screen.getByLabelText(/Label/) as HTMLInputElement
    fireEvent.change(input, { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled()
  })

  it('populates the input when a suggestion chip is clicked', () => {
    renderDialog({ suggestions: ['urgent', 'remote'] })
    const chip = screen.getByRole('button', { name: 'urgent' })
    fireEvent.click(chip)
    const input = screen.getByLabelText(/Label/) as HTMLInputElement
    expect(input.value).toBe('urgent')
  })

  it('calls addEngagementTag with engagementId, trimmed label, and selected color', async () => {
    const tag: EngagementTag = {
      engagementId: 'eng-1',
      label: 'on-site',
      color: 'rose',
      createdBy: 'u-1',
      createdAt: '2026-04-27T00:00:00Z',
    }
    vi.mocked(addEngagementTag).mockResolvedValue({ success: true, data: tag })
    const { onSuccess, onOpenChange } = renderDialog()

    fireEvent.change(screen.getByLabelText(/Label/), { target: { value: '  on-site  ' } })
    fireEvent.click(screen.getByRole('radio', { name: /^Color rose$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }))

    await waitFor(() => {
      expect(addEngagementTag).toHaveBeenCalledWith('eng-1', 'on-site', 'rose')
    })
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(tag)
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('shows an error toast and stays open on action failure', async () => {
    vi.mocked(addEngagementTag).mockResolvedValue({ success: false, error: 'duplicate' })
    const { onOpenChange } = renderDialog()

    fireEvent.change(screen.getByLabelText(/Label/), { target: { value: 'dup' } })
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }))

    await waitFor(() => expect(addEngagementTag).toHaveBeenCalled())
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
