/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/app/actions/c3pao-notes', () => ({
  listNotes: vi.fn(),
  createNote: vi.fn(),
  editNote: vi.fn(),
  deleteNote: vi.fn(),
  listNoteRevisions: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { NotesPanel } from '@/components/c3pao/notes/notes-panel'
import * as actions from '@/app/actions/c3pao-notes'
import type { AssessmentNote } from '@/lib/readiness-types'

function makeNote(overrides: Partial<AssessmentNote> = {}): AssessmentNote {
  return {
    id: 'n1',
    engagementId: 'eng-1',
    authorId: 'u1',
    authorEmail: 'jane@x.com',
    authorName: 'Jane',
    body: 'Initial body',
    createdAt: '2026-04-20T00:00:00Z',
    updatedAt: '2026-04-20T00:00:00Z',
    deletedAt: null,
    revisionCount: 0,
    ...overrides,
  }
}

describe('NotesPanel', () => {
  beforeEach(() => {
    vi.mocked(actions.listNotes).mockReset()
    vi.mocked(actions.createNote).mockReset()
    vi.mocked(actions.editNote).mockReset()
    vi.mocked(actions.deleteNote).mockReset()
    vi.mocked(actions.listNotes).mockResolvedValue({ success: true, data: [] })
  })

  it('shows empty state when no notes exist', async () => {
    render(
      <NotesPanel engagementId="eng-1" currentUserId="u1" initialNotes={[]} />,
    )
    await act(async () => {})
    expect(screen.getByText(/No notes yet/i)).toBeInTheDocument()
  })

  it('renders initial notes and refetches on mount', async () => {
    vi.mocked(actions.listNotes).mockResolvedValue({
      success: true,
      data: [makeNote({ body: 'refreshed body' })],
    })
    render(
      <NotesPanel
        engagementId="eng-1"
        currentUserId="u1"
        initialNotes={[makeNote({ body: 'stale body' })]}
      />,
    )
    await act(async () => {})
    expect(actions.listNotes).toHaveBeenCalledWith('eng-1')
    expect(screen.getByText('refreshed body')).toBeInTheDocument()
  })

  it('opens the editor when Add note is clicked', async () => {
    render(
      <NotesPanel engagementId="eng-1" currentUserId="u1" initialNotes={[]} />,
    )
    await act(async () => {})
    fireEvent.click(screen.getByTestId('add-note-button'))
    // Dialog renders a textarea only when the editor is open.
    expect(screen.getByTestId('note-body-input')).toBeInTheDocument()
  })

  it('submits a new note via createNote and refreshes', async () => {
    vi.mocked(actions.createNote).mockResolvedValue({
      success: true,
      data: { id: 'n2' },
    })
    vi.mocked(actions.listNotes).mockResolvedValueOnce({ success: true, data: [] })
    vi.mocked(actions.listNotes).mockResolvedValueOnce({
      success: true,
      data: [makeNote({ id: 'n2', body: 'fresh' })],
    })
    render(
      <NotesPanel engagementId="eng-1" currentUserId="u1" initialNotes={[]} />,
    )
    await act(async () => {})
    fireEvent.click(screen.getByTestId('add-note-button'))
    fireEvent.change(screen.getByTestId('note-body-input'), {
      target: { value: 'fresh' },
    })
    // There are now multiple "Add note" labels (heading button + submit button);
    // pick the submit button in the dialog by role + disabled state transition.
    const submitButtons = screen.getAllByRole('button', { name: /Add note/i })
    const dialogSubmit = submitButtons.find((b) => b.getAttribute('type') === 'submit')
    await act(async () => {
      if (dialogSubmit) fireEvent.click(dialogSubmit)
    })
    expect(actions.createNote).toHaveBeenCalledWith('eng-1', 'fresh')
  })
})
