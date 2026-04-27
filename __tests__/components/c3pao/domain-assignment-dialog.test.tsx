/**
 * @vitest-environment jsdom
 *
 * Behavioral tests for <DomainAssignmentDialog>. Verifies:
 *   - All 14 CMMC family chips render
 *   - Pre-loaded domains start in selected state
 *   - Toggling a chip flips its aria-pressed state
 *   - Save is disabled until selection differs from initial set
 *   - Save invokes the server action with the correct family codes
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/app/actions/c3pao-team-assignment', () => ({
  setMemberDomains: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { DomainAssignmentDialog } from '@/components/c3pao/domain-assignment-dialog'
import { setMemberDomains } from '@/app/actions/c3pao-team-assignment'
import { CMMC_FAMILIES } from '@/lib/cmmc/families'

function renderDialog(overrides: Partial<Parameters<typeof DomainAssignmentDialog>[0]> = {}) {
  const onOpenChange = vi.fn()
  const onSuccess = vi.fn()
  const defaults = {
    open: true,
    onOpenChange,
    engagementId: 'eng-1',
    assessorId: 'a-1',
    assessorName: 'Alice Tester',
    initialDomains: ['AC', 'AT', 'AU', 'CM', 'IA'],
    onSuccess,
  }
  const props = { ...defaults, ...overrides }
  const utils = render(<DomainAssignmentDialog {...props} />)
  return { ...utils, onOpenChange, onSuccess, props }
}

describe('<DomainAssignmentDialog>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all 14 family chips', () => {
    renderDialog()
    for (const family of CMMC_FAMILIES) {
      const chip = screen.getByRole('button', { name: new RegExp(`^${family.code}[A-Z]`) })
      expect(chip).toBeInTheDocument()
    }
  })

  it('marks the 5 pre-loaded chips as pressed', () => {
    renderDialog({ initialDomains: ['AC', 'AT', 'AU', 'CM', 'IA'] })
    const preLoaded = ['AC', 'AT', 'AU', 'CM', 'IA']
    for (const code of preLoaded) {
      const chip = screen.getByRole('button', { name: new RegExp(`^${code}[A-Z]`) })
      expect(chip).toHaveAttribute('aria-pressed', 'true')
    }
    // A non-pre-loaded chip should NOT be pressed.
    const sc = screen.getByRole('button', { name: /^SC[A-Z]/ })
    expect(sc).toHaveAttribute('aria-pressed', 'false')
  })

  it('toggles a chip on click', () => {
    renderDialog({ initialDomains: [] })
    const chip = screen.getByRole('button', { name: /^AC[A-Z]/ })
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'false')
  })

  it('disables Save when no change has been made', () => {
    renderDialog({ initialDomains: ['AC', 'CM'] })
    const save = screen.getByRole('button', { name: /^Save$/ })
    expect(save).toBeDisabled()
  })

  it('enables Save once a chip has been toggled', () => {
    renderDialog({ initialDomains: ['AC'] })
    const save = screen.getByRole('button', { name: /^Save$/ })
    expect(save).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /^CM[A-Z]/ }))
    expect(save).not.toBeDisabled()
  })

  it('calls setMemberDomains with the toggled set on Save', async () => {
    vi.mocked(setMemberDomains).mockResolvedValue({ success: true })
    const { onSuccess } = renderDialog({ initialDomains: ['AC'] })

    // Add CM, remove AC.
    fireEvent.click(screen.getByRole('button', { name: /^CM[A-Z]/ }))
    fireEvent.click(screen.getByRole('button', { name: /^AC[A-Z]/ }))

    const save = screen.getByRole('button', { name: /^Save$/ })
    fireEvent.click(save)

    // Wait one microtask cycle for the async handler.
    await Promise.resolve()
    await Promise.resolve()

    expect(setMemberDomains).toHaveBeenCalledTimes(1)
    const callArgs = vi.mocked(setMemberDomains).mock.calls[0]
    expect(callArgs[0]).toBe('eng-1')
    expect(callArgs[1]).toBe('a-1')
    expect(callArgs[2].sort()).toEqual(['CM'])
    expect(onSuccess).toHaveBeenCalled()
  })
})
