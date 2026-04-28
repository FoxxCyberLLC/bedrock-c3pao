// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KindChip } from '@/components/c3pao/engagements/kind-chip'

describe('KindChip', () => {
  it('renders the current value as a label', () => {
    render(<KindChip value="all" onChange={() => {}} />)
    expect(screen.getByRole('button')).toHaveTextContent(/all kinds/i)
  })

  it('cycles all → osc → outside → all on click', () => {
    const handler = vi.fn()
    const { rerender } = render(<KindChip value="all" onChange={handler} />)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenLastCalledWith('osc')

    rerender(<KindChip value="osc" onChange={handler} />)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenLastCalledWith('outside')

    rerender(<KindChip value="outside" onChange={handler} />)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenLastCalledWith('all')
  })

  it('aria-pressed reflects whether the chip is filtering', () => {
    const { rerender } = render(<KindChip value="all" onChange={() => {}} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')

    rerender(<KindChip value="osc" onChange={() => {}} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')

    rerender(<KindChip value="outside" onChange={() => {}} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows a distinguishing label per state', () => {
    const { rerender } = render(<KindChip value="all" onChange={() => {}} />)
    expect(screen.getByRole('button')).toHaveTextContent('All kinds')

    rerender(<KindChip value="osc" onChange={() => {}} />)
    expect(screen.getByRole('button')).toHaveTextContent('OSC only')

    rerender(<KindChip value="outside" onChange={() => {}} />)
    expect(screen.getByRole('button')).toHaveTextContent('Outside only')
  })
})
