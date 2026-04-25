/**
 * @vitest-environment jsdom
 *
 * Regression test for the C3PAO Full SSP page crash.
 *
 * The SSP record stores `poamSummary`, `assetInventorySummary`, `acronyms`,
 * and `references` as JSON-serialized text columns. If any of those columns
 * contains malformed JSON (legacy data, partial writes, or a writer bug),
 * `JSON.parse` throws synchronously during render and the dashboard error
 * boundary shows "Something went wrong / An unexpected error occurred while
 * loading this page." The component must render the page (with empty
 * fallbacks for the bad field) instead of throwing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { SSPLongFormReadOnly } from '@/components/c3pao/ssp-long-form-read-only'

// SSPTableOfContents uses IntersectionObserver in a useEffect; jsdom doesn't ship it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
  root = null
  rootMargin = ''
  thresholds = []
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).IntersectionObserver = IntersectionObserverStub

function baseSsp(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'ssp-1',
    systemName: 'Test System',
    operationalPhase: 'OPERATIONAL',
    poamSummary: null,
    assetInventorySummary: null,
    acronyms: null,
    references: null,
    ...overrides,
  }
}

describe('SSPLongFormReadOnly — malformed JSON resilience', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('renders without throwing when poamSummary contains malformed JSON', () => {
    // "[1]X" reproduces the production error: valid JSON followed by a
    // non-whitespace character at column 4.
    expect(() => {
      render(<SSPLongFormReadOnly ssp={baseSsp({ poamSummary: '[1]X' })} />)
    }).not.toThrow()
  })

  it('renders without throwing when assetInventorySummary contains malformed JSON', () => {
    expect(() => {
      render(<SSPLongFormReadOnly ssp={baseSsp({ assetInventorySummary: '{not json}' })} />)
    }).not.toThrow()
  })

  it('renders without throwing when acronyms contains malformed JSON', () => {
    expect(() => {
      render(<SSPLongFormReadOnly ssp={baseSsp({ acronyms: 'undefined' })} />)
    }).not.toThrow()
  })

  it('renders without throwing when references contains malformed JSON', () => {
    expect(() => {
      render(<SSPLongFormReadOnly ssp={baseSsp({ references: '[1,2,' })} />)
    }).not.toThrow()
  })

  it('logs a warning identifying the malformed field', () => {
    render(<SSPLongFormReadOnly ssp={baseSsp({ poamSummary: '[1]X' })} />)
    expect(warnSpy).toHaveBeenCalled()
    const messages = warnSpy.mock.calls.map((args: unknown[]) => String(args[0]))
    expect(messages.some((m: string) => m.includes('poamSummary'))).toBe(true)
  })

  it('still parses valid JSON correctly', () => {
    const acronyms = JSON.stringify({ AO: 'Authorizing Official' })
    const { container } = render(
      <SSPLongFormReadOnly ssp={baseSsp({ acronyms })} />,
    )
    expect(container.textContent).toContain('Authorizing Official')
  })

  it('renders POA&M counts when poamSummary is an array (Go API shape)', () => {
    // Go API GenerateSSP writes poamSummary as a flat array of POAM rows.
    // The renderer expects a {summary: {totalOpen, byCriticality}} object;
    // the array shape must be coerced to it so counts show up.
    const poamSummary = JSON.stringify([
      { id: '1', riskLevel: 'CRITICAL', status: 'OPEN' },
      { id: '2', riskLevel: 'HIGH', status: 'IN_PROGRESS' },
      { id: '3', riskLevel: 'HIGH', status: 'CLOSED' }, // excluded from totalOpen
      { id: '4', riskLevel: 'LOW', status: 'OVERDUE' },
    ])
    const { container } = render(<SSPLongFormReadOnly ssp={baseSsp({ poamSummary })} />)
    const poamSection = container.querySelector('#section-poam')
    expect(poamSection).not.toBeNull()
    // Total Open = 3 (excluding CLOSED), 1 critical, 1 high, 0 moderate, 1 low
    const cells = poamSection!.querySelectorAll('.text-2xl.font-bold')
    expect(cells[0].textContent).toBe('3')
    expect(cells[1].textContent).toBe('1') // critical
    expect(cells[2].textContent).toBe('1') // high
    expect(cells[3].textContent).toBe('0') // moderate
    expect(cells[4].textContent).toBe('1') // low
  })
})
