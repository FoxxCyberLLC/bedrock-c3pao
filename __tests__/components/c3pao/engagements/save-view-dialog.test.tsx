/**
 * @vitest-environment jsdom
 *
 * Behavioral tests for <SaveViewDialog>. Verifies:
 *   - Save is disabled until a name is entered
 *   - Filter summary renders verbatim
 *   - Save calls createSavedViewAction with the trimmed name and the supplied filter
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/app/actions/c3pao-personal-views', () => ({
  createSavedViewAction: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { SaveViewDialog } from '@/components/c3pao/engagements/save-view-dialog'
import { createSavedViewAction } from '@/app/actions/c3pao-personal-views'
import type { SavedView, SavedViewFilter } from '@/lib/personal-views-types'

function renderDialog(overrides: Partial<Parameters<typeof SaveViewDialog>[0]> = {}) {
  const onOpenChange = vi.fn()
  const onSuccess = vi.fn()
  const filter: SavedViewFilter = { phase: 'REPORT', mineOnly: true, tags: ['on-site'] }
  const props = {
    open: true,
    onOpenChange,
    currentFilter: filter,
    filterSummary: 'Phase: Report · Mine only · Tags: on-site',
    onSuccess,
    ...overrides,
  }
  const utils = render(<SaveViewDialog {...props} />)
  return { ...utils, onOpenChange, onSuccess, filter }
}

describe('<SaveViewDialog>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('disables Save until a name is entered', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'My View' } })
    expect(screen.getByRole('button', { name: /^Save$/ })).not.toBeDisabled()
  })

  it('renders the filter summary verbatim', () => {
    renderDialog({ filterSummary: 'Phase: Assess · Pinned' })
    expect(screen.getByText('Phase: Assess · Pinned')).toBeInTheDocument()
  })

  it('calls createSavedViewAction with the trimmed name and provided filter', async () => {
    const created: SavedView = {
      id: 'sv-1',
      userId: 'u-1',
      name: 'My Reports',
      filter: { phase: 'REPORT', mineOnly: true, tags: ['on-site'] },
      createdAt: '2026-04-27T00:00:00Z',
    }
    vi.mocked(createSavedViewAction).mockResolvedValue({ success: true, data: created })
    const { onSuccess, onOpenChange, filter } = renderDialog()

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: '  My Reports  ' } })
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }))

    await waitFor(() => expect(createSavedViewAction).toHaveBeenCalledWith('My Reports', filter))
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(created)
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('does not close on failure', async () => {
    vi.mocked(createSavedViewAction).mockResolvedValue({ success: false, error: 'duplicate name' })
    const { onOpenChange } = renderDialog()

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }))

    await waitFor(() => expect(createSavedViewAction).toHaveBeenCalled())
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
