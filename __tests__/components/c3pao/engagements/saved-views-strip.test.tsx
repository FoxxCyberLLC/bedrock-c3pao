/**
 * @vitest-environment jsdom
 *
 * Behavioral tests for <SavedViewsStrip>. Verifies:
 *   - Renders nothing when views is empty
 *   - Renders a button per view
 *   - Click selects, click on active deselects
 *   - × triggers an AlertDialog confirm; Confirm calls onDelete
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { SavedViewsStrip } from '@/components/c3pao/engagements/saved-views-strip'
import type { SavedView } from '@/lib/personal-views-types'

function makeView(overrides: Partial<SavedView> = {}): SavedView {
  return {
    id: overrides.id ?? 'sv-1',
    userId: 'u-1',
    name: overrides.name ?? 'View',
    filter: overrides.filter ?? {},
    createdAt: '2026-04-27T00:00:00Z',
  }
}

describe('<SavedViewsStrip>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when views is empty', () => {
    const { container } = render(
      <SavedViewsStrip views={[]} activeViewId={null} onSelect={() => {}} onDelete={async () => {}} />,
    )
    expect(container.querySelector('[aria-label="Saved views"]')).toBeNull()
  })

  it('renders a button per view', () => {
    const views = [
      makeView({ id: 'a', name: 'Alpha' }),
      makeView({ id: 'b', name: 'Beta' }),
    ]
    render(
      <SavedViewsStrip views={views} activeViewId={null} onSelect={() => {}} onDelete={async () => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Beta' })).toBeInTheDocument()
  })

  it('calls onSelect with the view id when clicked', () => {
    const onSelect = vi.fn<(id: string | null) => void>()
    const views = [makeView({ id: 'a', name: 'Alpha' })]
    render(
      <SavedViewsStrip views={views} activeViewId={null} onSelect={onSelect} onDelete={async () => {}} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }))
    expect(onSelect).toHaveBeenCalledWith('a')
  })

  it('clicking the active view deselects (passes null)', () => {
    const onSelect = vi.fn<(id: string | null) => void>()
    const views = [makeView({ id: 'a', name: 'Alpha' })]
    render(
      <SavedViewsStrip views={views} activeViewId="a" onSelect={onSelect} onDelete={async () => {}} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }))
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('opens a confirm dialog and calls onDelete when confirmed', async () => {
    const onDelete = vi.fn(async () => {})
    const views = [makeView({ id: 'a', name: 'Alpha' })]
    render(
      <SavedViewsStrip views={views} activeViewId={null} onSelect={() => {}} onDelete={onDelete} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Delete view Alpha/ }))

    // Confirm dialog opens.
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('a'))
  })

  it('does not call onDelete when cancel is clicked', async () => {
    const onDelete = vi.fn(async () => {})
    const views = [makeView({ id: 'a', name: 'Alpha' })]
    render(
      <SavedViewsStrip views={views} activeViewId={null} onSelect={() => {}} onDelete={onDelete} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Delete view Alpha/ }))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onDelete).not.toHaveBeenCalled()
  })
})
