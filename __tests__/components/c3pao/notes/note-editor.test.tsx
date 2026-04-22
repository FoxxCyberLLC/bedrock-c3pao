/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { NoteEditor } from '@/components/c3pao/notes/note-editor'

describe('NoteEditor', () => {
  it('renders the dialog textarea when open in create mode', () => {
    render(
      <NoteEditor open onOpenChange={() => {}} onSubmit={() => {}} />,
    )
    expect(screen.getByTestId('note-body-input')).toBeInTheDocument()
    // Title appears in the dialog heading.
    expect(
      screen.getByRole('heading', { name: /Add note/i }),
    ).toBeInTheDocument()
  })

  it('renders the title and prefills body for edit mode', () => {
    render(
      <NoteEditor
        open
        mode="edit"
        initialBody="Existing body"
        onOpenChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(
      screen.getByRole('heading', { name: /Edit note/i }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('note-body-input')).toHaveValue('Existing body')
  })

  it('blocks submit when body is empty', async () => {
    const onSubmit = vi.fn()
    render(
      <NoteEditor open onOpenChange={() => {}} onSubmit={onSubmit} />,
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add note/i }))
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the trimmed body', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <NoteEditor open onOpenChange={() => {}} onSubmit={onSubmit} />,
    )
    fireEvent.change(screen.getByTestId('note-body-input'), {
      target: { value: '   hello   ' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add note/i }))
    })
    expect(onSubmit).toHaveBeenCalledWith('hello')
  })
})
