/**
 * @vitest-environment jsdom
 *
 * Behavioral tests for the SnapshotTimeline component. The component is
 * read-only: inputs go in, DOM comes out. Snapshots from the Go API are
 * rendered newest-first with a determination badge, a relative timestamp,
 * the captured-by name, and a [Current] tag on the isCurrent snapshot.
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import type { AssessmentSnapshotView } from '@/lib/api-client'
import { SnapshotTimeline } from '@/components/c3pao/snapshot-timeline'

function snap(overrides: Partial<AssessmentSnapshotView> = {}): AssessmentSnapshotView {
  return {
    id: 'snap-1',
    engagementId: 'eng-1',
    version: 1,
    determination: 'NO_CMMC_STATUS',
    capturedAt: '2026-04-22T10:00:00Z',
    capturedByUserId: 'user-1',
    capturedByName: 'Alice Assessor',
    parentSnapshotId: null,
    isCurrent: true,
    isFinal: false,
    ...overrides,
  }
}

describe('SnapshotTimeline', () => {
  it('renders nothing when snapshots array is empty', () => {
    const { container } = render(<SnapshotTimeline snapshots={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a green determination class for FINAL_LEVEL_2', () => {
    const { container } = render(
      <SnapshotTimeline
        snapshots={[
          snap({
            version: 1,
            determination: 'FINAL_LEVEL_2',
            isCurrent: true,
            isFinal: true,
          }),
        ]}
      />,
    )
    const badge = container.querySelector('[data-determination="FINAL_LEVEL_2"]')
    expect(badge).not.toBeNull()
    expect(badge?.className).toMatch(/green/)
  })

  it('renders an amber determination class for CONDITIONAL_LEVEL_2', () => {
    const { container } = render(
      <SnapshotTimeline
        snapshots={[snap({ determination: 'CONDITIONAL_LEVEL_2' })]}
      />,
    )
    const badge = container.querySelector('[data-determination="CONDITIONAL_LEVEL_2"]')
    expect(badge).not.toBeNull()
    expect(badge?.className).toMatch(/amber|yellow/)
  })

  it('renders a red determination class for NO_CMMC_STATUS', () => {
    const { container } = render(
      <SnapshotTimeline snapshots={[snap({ determination: 'NO_CMMC_STATUS' })]} />,
    )
    const badge = container.querySelector('[data-determination="NO_CMMC_STATUS"]')
    expect(badge).not.toBeNull()
    expect(badge?.className).toMatch(/red/)
  })

  it('renders a [Current] tag on the isCurrent snapshot only', () => {
    const { getAllByTestId, getByText } = render(
      <SnapshotTimeline
        snapshots={[
          snap({ id: 'a', version: 2, isCurrent: true }),
          snap({ id: 'b', version: 1, isCurrent: false, parentSnapshotId: null }),
        ]}
      />,
    )
    expect(getByText(/current/i)).toBeDefined()
    const rows = getAllByTestId('snapshot-row')
    // Only the first (current) row contains the tag
    const currentTags = rows[0].querySelectorAll('[data-testid="snapshot-current-tag"]')
    const olderTags = rows[1].querySelectorAll('[data-testid="snapshot-current-tag"]')
    expect(currentTags.length).toBe(1)
    expect(olderTags.length).toBe(0)
  })

  it('orders snapshots by version descending', () => {
    const { getAllByTestId } = render(
      <SnapshotTimeline
        snapshots={[
          snap({ id: 'c', version: 3, isCurrent: true }),
          snap({ id: 'b', version: 2, isCurrent: false, parentSnapshotId: 'a' }),
          snap({ id: 'a', version: 1, isCurrent: false, parentSnapshotId: null }),
        ]}
      />,
    )
    const rows = getAllByTestId('snapshot-row')
    expect(rows.length).toBe(3)
    // Each row includes its version number as text; first row should be the newest.
    expect(rows[0].textContent).toContain('v3')
    expect(rows[1].textContent).toContain('v2')
    expect(rows[2].textContent).toContain('v1')
  })
})
