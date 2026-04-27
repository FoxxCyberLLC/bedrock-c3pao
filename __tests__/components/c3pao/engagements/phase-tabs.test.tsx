/**
 * @vitest-environment jsdom
 *
 * Behavioral tests for <PhaseTabs>. Verifies:
 *   - All 5 tabs render
 *   - Clicking a tab calls onChange with that key
 *   - aria-selected reflects the active tab
 *   - counts render when provided
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhaseTabs } from '@/components/c3pao/engagements/phase-tabs'
import type { PhaseFilter } from '@/lib/personal-views-types'

describe('<PhaseTabs>', () => {
  it('renders all 5 tabs', () => {
    render(<PhaseTabs value="all" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: /^All/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Pre-Assess/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Assess/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Report/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Close-Out/ })).toBeInTheDocument()
  })

  it('marks the active tab as selected', () => {
    render(<PhaseTabs value="REPORT" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: /^Report/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onChange with the clicked tab key', () => {
    const onChange = vi.fn<(next: PhaseFilter) => void>()
    render(<PhaseTabs value="all" onChange={onChange} />)

    fireEvent.click(screen.getByRole('tab', { name: /^Pre-Assess/ }))
    fireEvent.click(screen.getByRole('tab', { name: /^Assess/ }))
    fireEvent.click(screen.getByRole('tab', { name: /^Close-Out/ }))

    expect(onChange).toHaveBeenNthCalledWith(1, 'PRE_ASSESS')
    expect(onChange).toHaveBeenNthCalledWith(2, 'ASSESS')
    expect(onChange).toHaveBeenNthCalledWith(3, 'CLOSE_OUT')
  })

  it('renders counts when provided', () => {
    render(
      <PhaseTabs
        value="all"
        onChange={() => {}}
        counts={{ PRE_ASSESS: 3, ASSESS: 7, REPORT: 0, CLOSE_OUT: 12 }}
      />,
    )
    // Counts are rendered as text inside their respective tabs.
    const preTab = screen.getByRole('tab', { name: /Pre-Assess/ })
    expect(preTab.textContent).toContain('3')
    const assessTab = screen.getByRole('tab', { name: /^Assess/ })
    expect(assessTab.textContent).toContain('7')
    const closeTab = screen.getByRole('tab', { name: /Close-Out/ })
    expect(closeTab.textContent).toContain('12')
  })

  it('does not render a count for undefined entries', () => {
    render(<PhaseTabs value="all" onChange={() => {}} counts={{ ASSESS: 4 }} />)
    const preTab = screen.getByRole('tab', { name: /Pre-Assess/ })
    // Pre-Assess label only — no trailing digits.
    expect(preTab.textContent?.replace(/\s/g, '')).toBe('Pre-Assess')
  })
})
