import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/lib/db-pins', () => ({
  listPinnedIds: vi.fn(),
  pin: vi.fn(),
  unpin: vi.fn(),
}))

vi.mock('@/lib/db-tags', () => ({
  listTagsForEngagement: vi.fn(),
  listAllTagsByEngagement: vi.fn(),
  listAllLabels: vi.fn(),
  addTag: vi.fn(),
  removeTag: vi.fn(),
}))

vi.mock('@/lib/db-snoozes', () => ({
  listActiveSnoozes: vi.fn(),
  snooze: vi.fn(),
  unsnooze: vi.fn(),
}))

vi.mock('@/lib/db-saved-views', () => ({
  listSavedViews: vi.fn(),
  createSavedView: vi.fn(),
  updateSavedView: vi.fn(),
  deleteSavedView: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const { requireAuth } = await import('@/lib/auth')
const Pins = await import('@/lib/db-pins')
const Tags = await import('@/lib/db-tags')
const Snoozes = await import('@/lib/db-snoozes')
const SavedViews = await import('@/lib/db-saved-views')

const Actions = await import('@/app/actions/c3pao-personal-views')

const USER_ID = 'user-1'
const ENG = 'eng-1'

function sessionFixture(): unknown {
  return {
    c3paoUser: {
      id: USER_ID,
      email: 'a@b.test',
      name: 'A B',
      c3paoId: 'c1',
      c3paoName: 'C',
      isLeadAssessor: true,
      status: 'active',
    },
    apiToken: 'tok',
    expires: new Date(Date.now() + 3600_000).toISOString(),
  }
}

function setSession(value: unknown): void {
  vi.mocked(requireAuth).mockResolvedValue(value as Awaited<ReturnType<typeof requireAuth>>)
}

beforeEach(() => {
  vi.clearAllMocks()
  setSession(sessionFixture())
})

describe('c3pao-personal-views — pins', () => {
  describe('listPinnedEngagementIds', () => {
    it('returns Unauthorized when there is no session', async () => {
      setSession(null)
      const result = await Actions.listPinnedEngagementIds()
      expect(result).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('returns ids on happy path', async () => {
      vi.mocked(Pins.listPinnedIds).mockResolvedValue(['eng-1', 'eng-2'])
      const result = await Actions.listPinnedEngagementIds()
      expect(result).toEqual({ success: true, data: ['eng-1', 'eng-2'] })
      expect(Pins.listPinnedIds).toHaveBeenCalledWith(USER_ID)
    })

    it('returns error when data layer throws', async () => {
      vi.mocked(Pins.listPinnedIds).mockRejectedValue(new Error('db down'))
      const result = await Actions.listPinnedEngagementIds()
      expect(result.success).toBe(false)
      expect(result.error).toContain('db down')
    })
  })

  describe('pinEngagement', () => {
    it('returns Unauthorized when there is no session', async () => {
      setSession(null)
      expect(await Actions.pinEngagement(ENG)).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('calls db pin with the user id and returns success', async () => {
      vi.mocked(Pins.pin).mockResolvedValue(undefined)
      const result = await Actions.pinEngagement(ENG)
      expect(result).toEqual({ success: true })
      expect(Pins.pin).toHaveBeenCalledWith(USER_ID, ENG)
    })

    it('propagates data layer errors', async () => {
      vi.mocked(Pins.pin).mockRejectedValue(new Error('boom'))
      const result = await Actions.pinEngagement(ENG)
      expect(result.success).toBe(false)
      expect(result.error).toBe('boom')
    })
  })

  describe('unpinEngagement', () => {
    it('returns Unauthorized when there is no session', async () => {
      setSession(null)
      expect(await Actions.unpinEngagement(ENG)).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('calls db unpin and returns success', async () => {
      vi.mocked(Pins.unpin).mockResolvedValue(undefined)
      const result = await Actions.unpinEngagement(ENG)
      expect(result).toEqual({ success: true })
      expect(Pins.unpin).toHaveBeenCalledWith(USER_ID, ENG)
    })

    it('propagates data layer errors', async () => {
      vi.mocked(Pins.unpin).mockRejectedValue(new Error('nope'))
      const result = await Actions.unpinEngagement(ENG)
      expect(result.success).toBe(false)
      expect(result.error).toBe('nope')
    })
  })
})

describe('c3pao-personal-views — tags', () => {
  describe('listEngagementTagsByEngagement', () => {
    it('returns Unauthorized when there is no session', async () => {
      setSession(null)
      expect(await Actions.listEngagementTagsByEngagement()).toEqual({
        success: false,
        error: 'Unauthorized',
      })
    })

    it('returns the grouped map on happy path', async () => {
      const map = { 'eng-1': [] }
      vi.mocked(Tags.listAllTagsByEngagement).mockResolvedValue(map)
      const result = await Actions.listEngagementTagsByEngagement()
      expect(result).toEqual({ success: true, data: map })
    })

    it('propagates data layer errors', async () => {
      vi.mocked(Tags.listAllTagsByEngagement).mockRejectedValue(new Error('q failed'))
      const result = await Actions.listEngagementTagsByEngagement()
      expect(result.success).toBe(false)
      expect(result.error).toBe('q failed')
    })
  })

  describe('listAllTagLabels', () => {
    it('returns Unauthorized without session', async () => {
      setSession(null)
      expect(await Actions.listAllTagLabels()).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('returns labels on happy path', async () => {
      vi.mocked(Tags.listAllLabels).mockResolvedValue(['urgent', 'review'])
      const result = await Actions.listAllTagLabels()
      expect(result).toEqual({ success: true, data: ['urgent', 'review'] })
    })

    it('propagates errors', async () => {
      vi.mocked(Tags.listAllLabels).mockRejectedValue(new Error('x'))
      expect((await Actions.listAllTagLabels()).success).toBe(false)
    })
  })

  describe('addEngagementTag', () => {
    it('returns Unauthorized without session', async () => {
      setSession(null)
      expect(await Actions.addEngagementTag(ENG, 'x', 'sky')).toEqual({
        success: false,
        error: 'Unauthorized',
      })
    })

    it('rejects empty / whitespace-only labels', async () => {
      const out = await Actions.addEngagementTag(ENG, '   ', 'sky')
      expect(out).toEqual({ success: false, error: 'Tag label is required' })
      expect(Tags.addTag).not.toHaveBeenCalled()
    })

    it('rejects labels longer than 40 chars', async () => {
      const long = 'x'.repeat(41)
      const out = await Actions.addEngagementTag(ENG, long, 'sky')
      expect(out.success).toBe(false)
      expect(out.error).toMatch(/40/)
    })

    it('rejects invalid colors', async () => {
      const out = await Actions.addEngagementTag(ENG, 'x', 'magenta' as unknown as 'sky')
      expect(out).toEqual({ success: false, error: 'Invalid color' })
    })

    it('returns the created tag on happy path with trimmed label', async () => {
      const tag = {
        engagementId: ENG,
        label: 'urgent',
        color: 'rose' as const,
        createdBy: USER_ID,
        createdAt: '2026-04-01T00:00:00Z',
      }
      vi.mocked(Tags.addTag).mockResolvedValue(tag)
      const result = await Actions.addEngagementTag(ENG, '  urgent  ', 'rose')
      expect(result).toEqual({ success: true, data: tag })
      expect(Tags.addTag).toHaveBeenCalledWith({
        engagementId: ENG,
        label: 'urgent',
        color: 'rose',
        createdBy: USER_ID,
      })
    })

    it('propagates data layer errors', async () => {
      vi.mocked(Tags.addTag).mockRejectedValue(new Error('insert fail'))
      const result = await Actions.addEngagementTag(ENG, 'x', 'sky')
      expect(result.success).toBe(false)
      expect(result.error).toBe('insert fail')
    })
  })

  describe('removeEngagementTag', () => {
    it('returns Unauthorized without session', async () => {
      setSession(null)
      expect(await Actions.removeEngagementTag(ENG, 'x')).toEqual({
        success: false,
        error: 'Unauthorized',
      })
    })

    it('returns success on happy path', async () => {
      vi.mocked(Tags.removeTag).mockResolvedValue(undefined)
      expect(await Actions.removeEngagementTag(ENG, 'x')).toEqual({ success: true })
      expect(Tags.removeTag).toHaveBeenCalledWith(ENG, 'x')
    })

    it('propagates errors', async () => {
      vi.mocked(Tags.removeTag).mockRejectedValue(new Error('z'))
      expect((await Actions.removeEngagementTag(ENG, 'x')).success).toBe(false)
    })
  })
})

describe('c3pao-personal-views — snoozes', () => {
  describe('listActiveSnoozesAction', () => {
    it('returns Unauthorized without session', async () => {
      setSession(null)
      expect(await Actions.listActiveSnoozesAction()).toEqual({
        success: false,
        error: 'Unauthorized',
      })
    })

    it('returns snoozes on happy path', async () => {
      const snoozes = [{ engagementId: ENG, hiddenUntil: '2026-05-01T00:00:00Z', reason: null }]
      vi.mocked(Snoozes.listActiveSnoozes).mockResolvedValue(snoozes)
      expect(await Actions.listActiveSnoozesAction()).toEqual({ success: true, data: snoozes })
    })

    it('propagates errors', async () => {
      vi.mocked(Snoozes.listActiveSnoozes).mockRejectedValue(new Error('z'))
      expect((await Actions.listActiveSnoozesAction()).success).toBe(false)
    })
  })

  describe('snoozeEngagement', () => {
    it('returns Unauthorized without session', async () => {
      setSession(null)
      const future = new Date(Date.now() + 86400_000).toISOString()
      expect(await Actions.snoozeEngagement(ENG, future)).toEqual({
        success: false,
        error: 'Unauthorized',
      })
    })

    it('rejects invalid date strings', async () => {
      const out = await Actions.snoozeEngagement(ENG, 'not-a-date')
      expect(out).toEqual({ success: false, error: 'Invalid snooze date' })
      expect(Snoozes.snooze).not.toHaveBeenCalled()
    })

    it('rejects past dates', async () => {
      const past = new Date(Date.now() - 60_000).toISOString()
      const out = await Actions.snoozeEngagement(ENG, past)
      expect(out.success).toBe(false)
      expect(out.error).toMatch(/future/)
    })

    it('returns success on happy path', async () => {
      vi.mocked(Snoozes.snooze).mockResolvedValue(undefined)
      const future = new Date(Date.now() + 86400_000).toISOString()
      const result = await Actions.snoozeEngagement(ENG, future, 'pending docs')
      expect(result).toEqual({ success: true })
      expect(Snoozes.snooze).toHaveBeenCalledWith({
        userId: USER_ID,
        engagementId: ENG,
        hiddenUntil: expect.any(Date),
        reason: 'pending docs',
      })
    })

    it('propagates errors', async () => {
      vi.mocked(Snoozes.snooze).mockRejectedValue(new Error('boom'))
      const future = new Date(Date.now() + 86400_000).toISOString()
      const result = await Actions.snoozeEngagement(ENG, future)
      expect(result.success).toBe(false)
    })
  })

  describe('unsnoozeEngagement', () => {
    it('returns Unauthorized without session', async () => {
      setSession(null)
      expect(await Actions.unsnoozeEngagement(ENG)).toEqual({
        success: false,
        error: 'Unauthorized',
      })
    })

    it('returns success on happy path', async () => {
      vi.mocked(Snoozes.unsnooze).mockResolvedValue(undefined)
      expect(await Actions.unsnoozeEngagement(ENG)).toEqual({ success: true })
      expect(Snoozes.unsnooze).toHaveBeenCalledWith(USER_ID, ENG)
    })

    it('propagates errors', async () => {
      vi.mocked(Snoozes.unsnooze).mockRejectedValue(new Error('x'))
      expect((await Actions.unsnoozeEngagement(ENG)).success).toBe(false)
    })
  })
})

describe('c3pao-personal-views — saved views', () => {
  describe('listSavedViewsAction', () => {
    it('returns Unauthorized without session', async () => {
      setSession(null)
      expect(await Actions.listSavedViewsAction()).toEqual({
        success: false,
        error: 'Unauthorized',
      })
    })

    it('returns rows on happy path', async () => {
      const views = [
        {
          id: 'v1',
          userId: USER_ID,
          name: 'A',
          filter: { phase: 'ASSESS' as const },
          createdAt: '2026-04-01T00:00:00Z',
        },
      ]
      vi.mocked(SavedViews.listSavedViews).mockResolvedValue(views)
      expect(await Actions.listSavedViewsAction()).toEqual({ success: true, data: views })
    })

    it('propagates errors', async () => {
      vi.mocked(SavedViews.listSavedViews).mockRejectedValue(new Error('q'))
      expect((await Actions.listSavedViewsAction()).success).toBe(false)
    })
  })

  describe('createSavedViewAction', () => {
    it('returns Unauthorized without session', async () => {
      setSession(null)
      expect(await Actions.createSavedViewAction('n', {})).toEqual({
        success: false,
        error: 'Unauthorized',
      })
    })

    it('rejects empty names', async () => {
      const out = await Actions.createSavedViewAction('   ', {})
      expect(out).toEqual({ success: false, error: 'View name is required' })
      expect(SavedViews.createSavedView).not.toHaveBeenCalled()
    })

    it('rejects names longer than 60 chars', async () => {
      const long = 'x'.repeat(61)
      const out = await Actions.createSavedViewAction(long, {})
      expect(out.success).toBe(false)
      expect(out.error).toMatch(/60/)
    })

    it('returns the created view on happy path', async () => {
      const view = {
        id: 'v-new',
        userId: USER_ID,
        name: 'My View',
        filter: { phase: 'ASSESS' as const },
        createdAt: '2026-04-01T00:00:00Z',
      }
      vi.mocked(SavedViews.createSavedView).mockResolvedValue(view)
      const out = await Actions.createSavedViewAction('  My View  ', { phase: 'ASSESS' })
      expect(out).toEqual({ success: true, data: view })
      expect(SavedViews.createSavedView).toHaveBeenCalledWith({
        userId: USER_ID,
        name: 'My View',
        filter: { phase: 'ASSESS' },
      })
    })

    it('propagates errors', async () => {
      vi.mocked(SavedViews.createSavedView).mockRejectedValue(new Error('q'))
      const out = await Actions.createSavedViewAction('n', {})
      expect(out.success).toBe(false)
    })
  })

  describe('updateSavedViewAction', () => {
    it('returns Unauthorized without session', async () => {
      setSession(null)
      expect(await Actions.updateSavedViewAction('id', { name: 'x' })).toEqual({
        success: false,
        error: 'Unauthorized',
      })
    })

    it('rejects empty patch.name when present', async () => {
      const out = await Actions.updateSavedViewAction('id', { name: '   ' })
      expect(out).toEqual({ success: false, error: 'View name is required' })
      expect(SavedViews.updateSavedView).not.toHaveBeenCalled()
    })

    it('returns updated view on happy path', async () => {
      const view = {
        id: 'v-1',
        userId: USER_ID,
        name: 'New Name',
        filter: { phase: 'ASSESS' as const },
        createdAt: '2026-04-01T00:00:00Z',
      }
      vi.mocked(SavedViews.updateSavedView).mockResolvedValue(view)
      const out = await Actions.updateSavedViewAction('v-1', { name: '  New Name  ' })
      expect(out).toEqual({ success: true, data: view })
      expect(SavedViews.updateSavedView).toHaveBeenCalledWith({
        id: 'v-1',
        userId: USER_ID,
        patch: { name: 'New Name' },
      })
    })

    it('propagates errors', async () => {
      vi.mocked(SavedViews.updateSavedView).mockRejectedValue(new Error('not found'))
      const out = await Actions.updateSavedViewAction('id', { name: 'x' })
      expect(out.success).toBe(false)
      expect(out.error).toBe('not found')
    })
  })

  describe('deleteSavedViewAction', () => {
    it('returns Unauthorized without session', async () => {
      setSession(null)
      expect(await Actions.deleteSavedViewAction('id')).toEqual({
        success: false,
        error: 'Unauthorized',
      })
    })

    it('returns success on happy path', async () => {
      vi.mocked(SavedViews.deleteSavedView).mockResolvedValue(undefined)
      expect(await Actions.deleteSavedViewAction('v-1')).toEqual({ success: true })
      expect(SavedViews.deleteSavedView).toHaveBeenCalledWith('v-1', USER_ID)
    })

    it('propagates errors', async () => {
      vi.mocked(SavedViews.deleteSavedView).mockRejectedValue(new Error('x'))
      expect((await Actions.deleteSavedViewAction('v-1')).success).toBe(false)
    })
  })
})
