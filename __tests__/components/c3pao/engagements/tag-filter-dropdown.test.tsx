/**
 * @vitest-environment jsdom
 *
 * Behavioral tests for <TagFilterDropdown>. Verifies:
 *   - Empty-state trigger when no labels
 *   - Trigger shows the selected count
 *   - Trigger has proper aria attributes for an open/close menu
 *   - Opening the menu reveals all labels and toggling emits the new selection
 *
 * Note: Radix DropdownMenu in jsdom requires userEvent (real pointer events)
 * to open — fireEvent.click on the trigger is silently ignored.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagFilterDropdown } from '@/components/c3pao/engagements/tag-filter-dropdown'

describe('<TagFilterDropdown>', () => {
  it('renders an empty-state trigger when no labels exist', () => {
    render(<TagFilterDropdown allLabels={[]} selected={[]} onChange={() => {}} />)
    const trigger = screen.getByRole('button', { name: /no tags yet/i })
    expect(trigger).toBeDisabled()
  })

  it('renders the selected count when any are selected', () => {
    render(
      <TagFilterDropdown
        allLabels={['a', 'b', 'c']}
        selected={['a', 'c']}
        onChange={() => {}}
      />,
    )
    const trigger = screen.getByRole('button', { name: /tags/i })
    expect(trigger.textContent).toContain('2')
  })

  it('does not show a count badge when nothing is selected', () => {
    render(
      <TagFilterDropdown
        allLabels={['a', 'b']}
        selected={[]}
        onChange={() => {}}
      />,
    )
    const trigger = screen.getByRole('button', { name: /tags/i })
    const numericBadges = Array.from(trigger.querySelectorAll('span')).filter((s) =>
      /^\d+$/.test((s.textContent ?? '').trim()),
    )
    expect(numericBadges).toHaveLength(0)
  })

  it('opens the menu and renders every label as a checkbox item', async () => {
    const user = userEvent.setup()
    render(
      <TagFilterDropdown
        allLabels={['on-site', 'remote', 'urgent']}
        selected={[]}
        onChange={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: /tags/i }))
    expect(await screen.findByRole('menuitemcheckbox', { name: /on-site/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitemcheckbox', { name: /remote/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitemcheckbox', { name: /urgent/i })).toBeInTheDocument()
  })

  it('emits a new array containing the toggled label when off→on', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(next: string[]) => void>()
    render(
      <TagFilterDropdown
        allLabels={['on-site', 'remote']}
        selected={[]}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /tags/i }))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /on-site/i }))
    expect(onChange).toHaveBeenCalledWith(['on-site'])
  })

  it('emits an array without the toggled label when on→off', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(next: string[]) => void>()
    render(
      <TagFilterDropdown
        allLabels={['on-site', 'remote']}
        selected={['on-site']}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /tags/i }))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /on-site/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
