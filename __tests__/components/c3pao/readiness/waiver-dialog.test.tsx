/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { WaiverDialog } from '@/components/c3pao/readiness/waiver-dialog'

describe('WaiverDialog', () => {
  it('renders closed dialog content only when open', () => {
    render(
      <WaiverDialog
        open={false}
        onOpenChange={() => {}}
        itemKey="contract_executed"
        onSubmit={() => {}}
      />,
    )
    expect(screen.queryByTestId('waiver-reason-input')).not.toBeInTheDocument()
  })

  it('renders the item title in the dialog heading', () => {
    render(
      <WaiverDialog
        open={true}
        onOpenChange={() => {}}
        itemKey="ssp_reviewed"
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByText(/Waive: SSP Reviewed/)).toBeInTheDocument()
  })

  it('blocks submit when reason is under 20 characters', async () => {
    const onSubmit = vi.fn()
    render(
      <WaiverDialog
        open={true}
        onOpenChange={() => {}}
        itemKey="contract_executed"
        onSubmit={onSubmit}
      />,
    )
    const textarea = screen.getByTestId('waiver-reason-input')
    fireEvent.change(textarea, { target: { value: 'too short' } })
    const submit = screen.getByRole('button', { name: /Grant waiver/i })
    expect(submit).toBeDisabled()
    await act(async () => {
      fireEvent.click(submit)
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the trimmed reason when ≥ 20 chars', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <WaiverDialog
        open={true}
        onOpenChange={() => {}}
        itemKey="contract_executed"
        onSubmit={onSubmit}
      />,
    )
    const longReason = '  Contract pending legal review this quarter  '
    fireEvent.change(screen.getByTestId('waiver-reason-input'), {
      target: { value: longReason },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Grant waiver/i }))
    })
    expect(onSubmit).toHaveBeenCalledWith(longReason.trim())
  })

  it('disables submit while pending', () => {
    render(
      <WaiverDialog
        open={true}
        onOpenChange={() => {}}
        itemKey="contract_executed"
        onSubmit={() => {}}
        pending
      />,
    )
    const submit = screen.getByRole('button', { name: /Waiving/i })
    expect(submit).toBeDisabled()
  })
})
