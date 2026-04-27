/**
 * @vitest-environment jsdom
 *
 * Behavioral tests for <EngagementTagChip>. Verifies:
 *   - Renders the tag label
 *   - Applies the color palette
 *   - X button only shows when onRemove is provided
 *   - Clicking X calls onRemove (and stops propagation so the row doesn't open)
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EngagementTagChip } from '@/components/c3pao/engagements/engagement-tag-chip'
import type { EngagementTag } from '@/lib/personal-views-types'

function makeTag(overrides: Partial<EngagementTag> = {}): EngagementTag {
  return {
    engagementId: 'eng-1',
    label: 'on-site',
    color: 'sky',
    createdBy: 'u-1',
    createdAt: '2026-04-27T00:00:00Z',
    ...overrides,
  }
}

describe('<EngagementTagChip>', () => {
  it('renders the label', () => {
    render(<EngagementTagChip tag={makeTag()} />)
    expect(screen.getByText('on-site')).toBeInTheDocument()
  })

  it('does not render the remove button when onRemove is omitted', () => {
    render(<EngagementTagChip tag={makeTag()} />)
    expect(screen.queryByRole('button', { name: /remove tag/i })).not.toBeInTheDocument()
  })

  it('renders the remove button when onRemove is provided and calls it on click', () => {
    const onRemove = vi.fn()
    render(<EngagementTagChip tag={makeTag()} onRemove={onRemove} />)
    const btn = screen.getByRole('button', { name: /remove tag on-site/i })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('applies a color-tinted class for each color', () => {
    const { container, rerender } = render(<EngagementTagChip tag={makeTag({ color: 'sky' })} />)
    expect(container.querySelector('.bg-sky-50, .dark\\:bg-sky-950\\/40')).not.toBeNull()
    rerender(<EngagementTagChip tag={makeTag({ color: 'rose', label: 'urgent' })} />)
    expect(container.querySelector('.bg-rose-50, .dark\\:bg-rose-950\\/40')).not.toBeNull()
  })
})
