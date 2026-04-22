/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { ReadinessItemList } from '@/components/c3pao/readiness/readiness-item-list'
import { READINESS_ITEM_KEYS } from '@/lib/readiness-types'
import type { ReadinessItem } from '@/lib/readiness-types'

function makeItem(
  overrides: Partial<ReadinessItem> & Pick<ReadinessItem, 'itemKey'>,
): ReadinessItem {
  const base: ReadinessItem = {
    id: `id-${overrides.itemKey}`,
    engagementId: 'eng-1',
    itemKey: overrides.itemKey,
    status: 'not_started',
    completedBy: null,
    completedByEmail: null,
    completedAt: null,
    waivedBy: null,
    waivedByEmail: null,
    waivedAt: null,
    waiverReason: null,
    updatedAt: '2026-04-22T00:00:00Z',
    artifacts: [],
  }
  return { ...base, ...overrides }
}

function allEightItems(): ReadinessItem[] {
  return READINESS_ITEM_KEYS.map((k) => makeItem({ itemKey: k }))
}

describe('ReadinessItemList', () => {
  it('renders all 8 items with titles', () => {
    render(
      <ReadinessItemList
        items={allEightItems()}
        selectedKey="contract_executed"
        onSelect={() => {}}
        progress={{ completed: 0, total: 8 }}
      />,
    )
    expect(screen.getByText('Contract Executed')).toBeInTheDocument()
    expect(screen.getByText('Uploaded to eMASS')).toBeInTheDocument()
  })

  it('shows the progress ratio', () => {
    render(
      <ReadinessItemList
        items={allEightItems()}
        selectedKey="contract_executed"
        onSelect={() => {}}
        progress={{ completed: 3, total: 8 }}
      />,
    )
    expect(screen.getByText('3/8')).toBeInTheDocument()
  })

  it('highlights the selected item via aria-current', () => {
    render(
      <ReadinessItemList
        items={allEightItems()}
        selectedKey="ssp_reviewed"
        onSelect={() => {}}
        progress={{ completed: 0, total: 8 }}
      />,
    )
    const btn = screen.getByTestId('readiness-item-ssp_reviewed')
    expect(btn).toHaveAttribute('aria-current', 'true')
  })

  it('calls onSelect with the item key when a row is clicked', () => {
    const onSelect = vi.fn()
    render(
      <ReadinessItemList
        items={allEightItems()}
        selectedKey="contract_executed"
        onSelect={onSelect}
        progress={{ completed: 0, total: 8 }}
      />,
    )
    fireEvent.click(screen.getByTestId('readiness-item-coi_cleared'))
    expect(onSelect).toHaveBeenCalledWith('coi_cleared')
  })

  it('shows a "Complete" summary for completed items', () => {
    const items = allEightItems().map((i) =>
      i.itemKey === 'contract_executed'
        ? {
            ...i,
            status: 'complete' as const,
            completedBy: 'L. Chen',
            completedAt: '2026-04-19T12:00:00Z',
          }
        : i,
    )
    render(
      <ReadinessItemList
        items={items}
        selectedKey="contract_executed"
        onSelect={() => {}}
        progress={{ completed: 1, total: 8 }}
      />,
    )
    expect(screen.getByText(/Complete — L\. Chen/)).toBeInTheDocument()
  })
})
