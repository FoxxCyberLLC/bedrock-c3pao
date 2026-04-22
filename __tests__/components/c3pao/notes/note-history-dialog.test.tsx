/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'

vi.mock('@/app/actions/c3pao-notes', () => ({
  listNoteRevisions: vi.fn(),
}))

import { NoteHistoryDialog } from '@/components/c3pao/notes/note-history-dialog'
import * as actions from '@/app/actions/c3pao-notes'

describe('NoteHistoryDialog', () => {
  beforeEach(() => {
    vi.mocked(actions.listNoteRevisions).mockReset()
  })

  it('does not fetch when closed', () => {
    render(
      <NoteHistoryDialog open={false} onOpenChange={() => {}} noteId="n1" />,
    )
    expect(actions.listNoteRevisions).not.toHaveBeenCalled()
  })

  it('fetches and displays revisions in chronological order when open', async () => {
    vi.mocked(actions.listNoteRevisions).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'r1',
          noteId: 'n1',
          body: 'first body',
          editedBy: 'Jane',
          editedByEmail: 'jane@x.com',
          revisedAt: '2026-04-01T00:00:00Z',
        },
        {
          id: 'r2',
          noteId: 'n1',
          body: 'second body',
          editedBy: 'Jane',
          editedByEmail: 'jane@x.com',
          revisedAt: '2026-04-02T00:00:00Z',
        },
      ],
    })
    render(
      <NoteHistoryDialog open={true} onOpenChange={() => {}} noteId="n1" />,
    )
    await act(async () => {})
    const revisions = screen.getAllByTestId('note-revision')
    expect(revisions).toHaveLength(2)
    expect(revisions[0]).toHaveTextContent('first body')
    expect(revisions[1]).toHaveTextContent('second body')
  })

  it('renders the error message when fetch fails', async () => {
    vi.mocked(actions.listNoteRevisions).mockResolvedValue({
      success: false,
      error: 'boom',
    })
    render(
      <NoteHistoryDialog open={true} onOpenChange={() => {}} noteId="n1" />,
    )
    await act(async () => {})
    expect(screen.getByText('boom')).toBeInTheDocument()
  })
})
