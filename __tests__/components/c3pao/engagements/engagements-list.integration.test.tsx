/**
 * @vitest-environment jsdom
 *
 * Integration tests for <EngagementsList> covering the engagements
 * power-tools layer:
 *   - Phase tabs filter
 *   - Chip toggles (Pinned, Hide snoozed)
 *   - Tag filter dropdown
 *   - Star toggle calls pin action
 *   - Save view dialog opens when filter is non-default
 *   - Saved view selection applies that view's filter
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EngagementsList } from '@/components/c3pao/engagements/engagements-list'
import type { PortfolioRow } from '@/lib/engagements-list/types'
import type {
  ActiveSnooze,
  EngagementTag,
  SavedView,
} from '@/lib/personal-views-types'

const pinEngagementMock = vi.fn().mockResolvedValue({ success: true })
const unpinEngagementMock = vi.fn().mockResolvedValue({ success: true })
const removeEngagementTagMock = vi.fn().mockResolvedValue({ success: true })
const deleteSavedViewActionMock = vi.fn().mockResolvedValue({ success: true })

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/app/actions/c3pao-personal-views', () => ({
  pinEngagement: (...args: unknown[]) => pinEngagementMock(...args),
  unpinEngagement: (...args: unknown[]) => unpinEngagementMock(...args),
  removeEngagementTag: (...args: unknown[]) => removeEngagementTagMock(...args),
  addEngagementTag: vi.fn().mockResolvedValue({ success: true }),
  snoozeEngagement: vi.fn().mockResolvedValue({ success: true }),
  unsnoozeEngagement: vi.fn().mockResolvedValue({ success: true }),
  deleteSavedViewAction: (...args: unknown[]) =>
    deleteSavedViewActionMock(...args),
  createSavedViewAction: vi.fn().mockResolvedValue({ success: true }),
}))

function buildRow(overrides: Partial<PortfolioRow>): PortfolioRow {
  return {
    id: overrides.id ?? 'r-1',
    packageName: overrides.packageName ?? 'Pkg',
    organizationName: overrides.organizationName ?? 'Org',
    status: 'IN_PROGRESS',
    currentPhase: 'ASSESS',
    leadAssessorId: overrides.leadAssessorId ?? null,
    leadAssessorName: overrides.leadAssessorName ?? null,
    scheduledStartDate: null,
    scheduledEndDate: null,
    daysInPhase: 0,
    objectivesTotal: 110,
    objectivesAssessed: 0,
    assessmentResult: null,
    certStatus: null,
    certExpiresAt: null,
    poamCloseoutDue: null,
    reevalWindowOpenUntil: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    findingsCount: null,
    kind: 'osc',
    ...overrides,
  }
}

const ROWS: PortfolioRow[] = [
  buildRow({
    id: 'eng-1',
    organizationName: 'Acme',
    packageName: 'Acme-Pkg',
    leadAssessorId: 'me',
    leadAssessorName: 'Me',
    currentPhase: 'PRE_ASSESS',
  }),
  buildRow({
    id: 'eng-2',
    organizationName: 'Beta',
    packageName: 'Beta-Pkg',
    leadAssessorId: 'me',
    leadAssessorName: 'Me',
    currentPhase: 'ASSESS',
  }),
  buildRow({
    id: 'eng-3',
    organizationName: 'Wonka',
    packageName: 'Wonka-Pkg',
    leadAssessorId: 'someone-else',
    leadAssessorName: 'Bob',
    currentPhase: 'ASSESS',
  }),
  buildRow({
    id: 'eng-4',
    organizationName: 'Stark',
    packageName: 'Stark-Pkg',
    leadAssessorId: 'me',
    leadAssessorName: 'Me',
    currentPhase: 'REPORT',
  }),
  buildRow({
    id: 'eng-5',
    organizationName: 'Hidden',
    packageName: 'Hidden-Pkg',
    leadAssessorId: 'me',
    leadAssessorName: 'Me',
    currentPhase: 'CLOSE_OUT',
  }),
]

const PINNED_IDS = ['eng-1', 'eng-2']
const SNOOZES: ActiveSnooze[] = [
  {
    engagementId: 'eng-5',
    hiddenUntil: '2099-01-01T00:00:00Z',
    reason: null,
  },
]
const TAGS_BY_ENGAGEMENT: Record<string, EngagementTag[]> = {
  'eng-1': [
    {
      engagementId: 'eng-1',
      label: 'on-site',
      color: 'sky',
      createdBy: 'me',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
  'eng-3': [
    {
      engagementId: 'eng-3',
      label: 'urgent',
      color: 'rose',
      createdBy: 'me',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      engagementId: 'eng-3',
      label: 'on-site',
      color: 'sky',
      createdBy: 'me',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
}
const ALL_TAG_LABELS = ['on-site', 'urgent']
const SAVED_VIEWS: SavedView[] = [
  {
    id: 'view-mine-pre',
    userId: 'me',
    name: 'My Pre-Assess',
    filter: { phase: 'PRE_ASSESS', mineOnly: true },
    createdAt: '2026-01-01T00:00:00Z',
  },
]

function renderList(overrides: Partial<React.ComponentProps<typeof EngagementsList>> = {}) {
  return render(
    <EngagementsList
      initialItems={ROWS}
      currentUserId="me"
      leadOptions={[]}
      initialPinnedIds={PINNED_IDS}
      initialTagsByEngagement={TAGS_BY_ENGAGEMENT}
      initialAllTagLabels={ALL_TAG_LABELS}
      initialActiveSnoozes={SNOOZES}
      initialSavedViews={SAVED_VIEWS}
      {...overrides}
    />,
  )
}

describe('<EngagementsList> integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the visible (non-snoozed) rows by default', () => {
    renderList()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Wonka')).toBeInTheDocument()
    expect(screen.getByText('Stark')).toBeInTheDocument()
    // Hidden because hideSnoozed defaults to true.
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
  })

  it('renders the new phase tabs (replacing the legacy saved-views strip)', () => {
    renderList()
    expect(screen.getByRole('tab', { name: /^All/ })).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /^Pre-Assess/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Assess/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Report/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Close-Out/ })).toBeInTheDocument()
    // The legacy "My Active" hard-coded button must NOT be present.
    expect(screen.queryByRole('button', { name: /^My Active$/ })).toBeNull()
  })

  it('phase tab click filters the list to that phase', () => {
    renderList()
    fireEvent.click(screen.getByRole('tab', { name: /^Report/ }))
    expect(screen.getByText('Stark')).toBeInTheDocument()
    expect(screen.queryByText('Acme')).not.toBeInTheDocument()
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
    expect(screen.queryByText('Wonka')).not.toBeInTheDocument()
  })

  it('pinned chip toggle hides non-pinned rows', () => {
    renderList()
    fireEvent.click(screen.getByRole('button', { name: /Pinned/ }))
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.queryByText('Wonka')).not.toBeInTheDocument()
    expect(screen.queryByText('Stark')).not.toBeInTheDocument()
  })

  it('hide snoozed off reveals snoozed engagements', () => {
    renderList()
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Hide snoozed/ }))
    expect(screen.getByText('Hidden')).toBeInTheDocument()
  })

  it('mine-only chip filters to engagements led by current user', () => {
    renderList()
    fireEvent.click(screen.getByRole('button', { name: /Mine only/ }))
    expect(screen.queryByText('Wonka')).not.toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Stark')).toBeInTheDocument()
  })

  it('star button toggles pin and calls the pin action', async () => {
    renderList()
    const starButton = screen.getByLabelText('Pin Wonka')
    fireEvent.click(starButton)
    expect(pinEngagementMock).toHaveBeenCalledWith('eng-3')
  })

  it('star button on a pinned row calls the unpin action', async () => {
    renderList()
    const unpinButton = screen.getByLabelText('Unpin Acme')
    fireEvent.click(unpinButton)
    expect(unpinEngagementMock).toHaveBeenCalledWith('eng-1')
  })

  it('"Save current filter" button opens the save dialog when filter is non-default', () => {
    renderList()
    expect(
      screen.queryByRole('button', { name: /Save current filter/ }),
    ).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: /Pre-Assess/ }))
    fireEvent.click(
      screen.getByRole('button', { name: /Save current filter/ }),
    )
    expect(
      screen.getByRole('heading', { name: /Save filter view/ }),
    ).toBeInTheDocument()
  })

  it('renders the user-defined saved-views strip with the seeded view', () => {
    renderList()
    // The strip has both a primary "My Pre-Assess" trigger and a Delete X.
    expect(screen.getByText('My Pre-Assess')).toBeInTheDocument()
  })

  it('selecting a saved view applies its filter', () => {
    renderList()
    fireEvent.click(screen.getByText('My Pre-Assess'))
    // Saved view: phase=PRE_ASSESS + mineOnly=true → only Acme.
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
    expect(screen.queryByText('Wonka')).not.toBeInTheDocument()
    expect(screen.queryByText('Stark')).not.toBeInTheDocument()
  })

  it('renders inline tag chips next to engagements that have tags', () => {
    renderList()
    const acmeRow = screen.getByText('Acme').closest('tr') as HTMLElement
    expect(within(acmeRow).getByText('on-site')).toBeInTheDocument()
  })

  it('row dropdown menu exposes Add tag and Snooze actions', async () => {
    const user = userEvent.setup()
    renderList()
    const trigger = screen.getByLabelText('Actions for Acme')
    await user.click(trigger)
    expect(
      await screen.findByRole('menuitem', { name: /Add tag/ }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('menuitem', { name: /Snooze/ }),
    ).toBeInTheDocument()
  })

  it('renders the tag filter dropdown trigger when tags exist', () => {
    renderList()
    expect(screen.getByRole('button', { name: /Tags/ })).toBeInTheDocument()
  })

  it('shows the disabled "No tags yet" placeholder when no tags exist', () => {
    renderList({ initialAllTagLabels: [], initialTagsByEngagement: {} })
    expect(
      screen.getByRole('button', { name: /No tags yet/ }),
    ).toBeInTheDocument()
  })
})
