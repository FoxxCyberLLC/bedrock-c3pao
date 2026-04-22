/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { NoteCard } from '@/components/c3pao/notes/note-card'
import type { AssessmentNote } from '@/lib/readiness-types'

function makeNote(overrides: Partial<AssessmentNote> = {}): AssessmentNote {
  return {
    id: 'n1',
    engagementId: 'eng-1',
    authorId: 'u1',
    authorEmail: 'jane@x.com',
    authorName: 'Jane Assessor',
    body: 'Initial note body.',
    createdAt: '2026-04-20T00:00:00Z',
    updatedAt: '2026-04-20T00:00:00Z',
    deletedAt: null,
    revisionCount: 0,
    ...overrides,
  }
}

describe('NoteCard', () => {
  it('renders author name, body, and no edit/delete for non-author', () => {
    render(
      <NoteCard
        note={makeNote()}
        isAuthor={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onViewHistory={() => {}}
      />,
    )
    expect(screen.getByText('Jane Assessor')).toBeInTheDocument()
    expect(screen.getByText('Initial note body.')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Edit note/i }),
    ).not.toBeInTheDocument()
  })

  it('shows edit and delete buttons only for the author', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(
      <NoteCard
        note={makeNote()}
        isAuthor
        onEdit={onEdit}
        onDelete={onDelete}
        onViewHistory={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Edit note/i }))
    expect(onEdit).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Delete note/i }))
    expect(onDelete).toHaveBeenCalled()
  })

  it('shows lead assessor badge when flagged', () => {
    render(
      <NoteCard
        note={makeNote()}
        isAuthor={false}
        isAuthorLead
        onEdit={() => {}}
        onDelete={() => {}}
        onViewHistory={() => {}}
      />,
    )
    expect(screen.getByText(/Lead assessor/i)).toBeInTheDocument()
  })

  it('renders a View history link when revisionCount > 0', () => {
    const onViewHistory = vi.fn()
    render(
      <NoteCard
        note={makeNote({ revisionCount: 2 })}
        isAuthor={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onViewHistory={onViewHistory}
      />,
    )
    const link = screen.getByTestId('note-history-link')
    expect(link).toHaveTextContent(/Edited 2 times/i)
    fireEvent.click(link)
    expect(onViewHistory).toHaveBeenCalled()
  })

  it('hides the View history link when revisionCount is 0', () => {
    render(
      <NoteCard
        note={makeNote()}
        isAuthor={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onViewHistory={() => {}}
      />,
    )
    expect(screen.queryByTestId('note-history-link')).not.toBeInTheDocument()
  })
})
