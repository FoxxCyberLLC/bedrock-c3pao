/**
 * @vitest-environment jsdom
 *
 * OSC CAP Visibility (Task 10) — verifies the Share-with-customer toggle
 * on the C3PAO engagement comment composer:
 *  - Toggle defaults to OFF (visibility = INTERNAL)
 *  - Toggling ON and posting forwards visibility = CUSTOMER_VISIBLE
 *  - Customer-visible comments render the badge in the thread
 *  - Toggle resets to OFF after a successful post
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react'

vi.mock('@/app/actions/c3pao-comments', () => ({
  getEngagementComments: vi.fn(),
  createEngagementCommentAction: vi.fn(),
}))

vi.mock('@/app/actions/c3pao-dashboard', () => ({
  getC3PAOTeam: vi.fn(),
}))

import { EngagementComments } from '@/components/c3pao/engagement/engagement-comments'
import * as commentActions from '@/app/actions/c3pao-comments'
import * as dashboardActions from '@/app/actions/c3pao-dashboard'

describe('EngagementComments — Share-with-customer toggle', () => {
  beforeEach(() => {
    vi.mocked(commentActions.getEngagementComments).mockReset()
    vi.mocked(commentActions.createEngagementCommentAction).mockReset()
    vi.mocked(dashboardActions.getC3PAOTeam).mockReset()

    // Default: empty thread, no team members.
    vi.mocked(commentActions.getEngagementComments).mockResolvedValue({
      success: true,
      data: [],
    })
    vi.mocked(dashboardActions.getC3PAOTeam).mockResolvedValue({
      success: true,
      data: [],
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the toggle in OFF (Internal only) state by default', async () => {
    render(<EngagementComments engagementId="eng-1" />)
    await act(async () => {})

    const toggle = screen.getByTestId('share-with-customer-toggle')
    expect(toggle).toBeInTheDocument()
    expect(toggle).toHaveAttribute('data-state', 'unchecked')
    expect(screen.getByText(/Internal only/i)).toBeInTheDocument()
  })

  it('forwards visibility=INTERNAL when posting with the toggle OFF', async () => {
    vi.mocked(commentActions.createEngagementCommentAction).mockResolvedValue({
      success: true,
      data: {
        id: 'c1',
        engagementId: 'eng-1',
        c3paoId: 'org-1',
        authorId: 'u1',
        authorName: 'Jane Assessor',
        content: 'team note',
        mentions: [],
        parentId: null,
        visibility: 'INTERNAL',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })

    render(<EngagementComments engagementId="eng-1" />)
    await act(async () => {})

    const textarea = screen.getByPlaceholderText(/Add a comment/i)
    fireEvent.change(textarea, { target: { value: 'team note' } })

    const postButton = screen.getByRole('button', { name: /Post Comment/i })
    await act(async () => {
      fireEvent.click(postButton)
    })

    expect(commentActions.createEngagementCommentAction).toHaveBeenCalledWith(
      'eng-1',
      expect.objectContaining({
        content: 'team note',
        visibility: 'INTERNAL',
      }),
    )
  })

  it('forwards visibility=CUSTOMER_VISIBLE when toggle is ON and resets after post', async () => {
    vi.mocked(commentActions.createEngagementCommentAction).mockResolvedValue({
      success: true,
      data: {
        id: 'c1',
        engagementId: 'eng-1',
        c3paoId: 'org-1',
        authorId: 'u1',
        authorName: 'Jane Assessor',
        content: 'shared note',
        mentions: [],
        parentId: null,
        visibility: 'CUSTOMER_VISIBLE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })

    render(<EngagementComments engagementId="eng-1" />)
    await act(async () => {})

    // Flip the toggle ON
    const toggle = screen.getByTestId('share-with-customer-toggle')
    await act(async () => {
      fireEvent.click(toggle)
    })
    expect(toggle).toHaveAttribute('data-state', 'checked')
    expect(screen.getByText(/Visible to customer/i)).toBeInTheDocument()

    // Compose and submit
    const textarea = screen.getByPlaceholderText(/Add a comment/i)
    fireEvent.change(textarea, { target: { value: 'shared note' } })
    const postButton = screen.getByRole('button', { name: /Post Comment/i })
    await act(async () => {
      fireEvent.click(postButton)
    })

    expect(commentActions.createEngagementCommentAction).toHaveBeenCalledWith(
      'eng-1',
      expect.objectContaining({
        content: 'shared note',
        visibility: 'CUSTOMER_VISIBLE',
      }),
    )

    // Toggle should reset to OFF after successful post (defense against
    // muscle memory leaking subsequent comments to the customer).
    await act(async () => {})
    const toggleAfter = screen.getByTestId('share-with-customer-toggle')
    expect(toggleAfter).toHaveAttribute('data-state', 'unchecked')
  })

  it('renders the "Visible to customer" badge on customer-visible comments', async () => {
    vi.mocked(commentActions.getEngagementComments).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'c1',
          engagementId: 'eng-1',
          c3paoId: 'org-1',
          authorId: 'u1',
          authorName: 'Jane Assessor',
          content: 'shared with customer',
          mentions: [],
          parentId: null,
          visibility: 'CUSTOMER_VISIBLE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'c2',
          engagementId: 'eng-1',
          c3paoId: 'org-1',
          authorId: 'u1',
          authorName: 'Jane Assessor',
          content: 'internal only',
          mentions: [],
          parentId: null,
          visibility: 'INTERNAL',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    })

    render(<EngagementComments engagementId="eng-1" />)
    await act(async () => {})

    // Exactly one badge — only the CUSTOMER_VISIBLE row should have it.
    const badges = screen.getAllByTestId('customer-visible-badge')
    expect(badges).toHaveLength(1)
  })
})
