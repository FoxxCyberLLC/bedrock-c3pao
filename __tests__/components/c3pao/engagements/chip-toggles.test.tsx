/**
 * @vitest-environment jsdom
 *
 * Behavioral tests for <ChipToggles>. Verifies:
 *   - All 4 chips render with correct labels
 *   - Clicking a chip calls its corresponding setter with the flipped value
 *   - aria-pressed reflects on/off state
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChipToggles } from '@/components/c3pao/engagements/chip-toggles'

type Setter = (next: boolean) => void

interface Handlers {
  onMineOnlyChange: ReturnType<typeof vi.fn<Setter>>
  onAtRiskOnlyChange: ReturnType<typeof vi.fn<Setter>>
  onPinnedOnlyChange: ReturnType<typeof vi.fn<Setter>>
  onHideSnoozedChange: ReturnType<typeof vi.fn<Setter>>
}

function setup(state: Partial<{ mineOnly: boolean; atRiskOnly: boolean; pinnedOnly: boolean; hideSnoozed: boolean }> = {}) {
  const handlers: Handlers = {
    onMineOnlyChange: vi.fn<Setter>(),
    onAtRiskOnlyChange: vi.fn<Setter>(),
    onPinnedOnlyChange: vi.fn<Setter>(),
    onHideSnoozedChange: vi.fn<Setter>(),
  }
  render(
    <ChipToggles
      mineOnly={state.mineOnly ?? false}
      atRiskOnly={state.atRiskOnly ?? false}
      pinnedOnly={state.pinnedOnly ?? false}
      hideSnoozed={state.hideSnoozed ?? true}
      {...handlers}
    />,
  )
  return handlers
}

describe('<ChipToggles>', () => {
  it('renders all four chip labels', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Mine only' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'At risk' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pinned' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide snoozed' })).toBeInTheDocument()
  })

  it('reflects on/off state via aria-pressed', () => {
    setup({ mineOnly: true, hideSnoozed: false })
    expect(screen.getByRole('button', { name: 'Mine only' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'At risk' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Pinned' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Hide snoozed' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('flips Mine only via its setter', () => {
    const h = setup({ mineOnly: false })
    fireEvent.click(screen.getByRole('button', { name: 'Mine only' }))
    expect(h.onMineOnlyChange).toHaveBeenCalledWith(true)
  })

  it('flips At risk via its setter', () => {
    const h = setup({ atRiskOnly: true })
    fireEvent.click(screen.getByRole('button', { name: 'At risk' }))
    expect(h.onAtRiskOnlyChange).toHaveBeenCalledWith(false)
  })

  it('flips Pinned via its setter', () => {
    const h = setup({ pinnedOnly: false })
    fireEvent.click(screen.getByRole('button', { name: 'Pinned' }))
    expect(h.onPinnedOnlyChange).toHaveBeenCalledWith(true)
  })

  it('flips Hide snoozed via its setter', () => {
    const h = setup({ hideSnoozed: true })
    fireEvent.click(screen.getByRole('button', { name: 'Hide snoozed' }))
    expect(h.onHideSnoozedChange).toHaveBeenCalledWith(false)
  })
})
