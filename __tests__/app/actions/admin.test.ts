import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/config', () => ({ getAllConfig: vi.fn() }))
vi.mock('@/lib/local-auth', () => ({
  getLocalAdmin: vi.fn(),
  listLocalUsers: vi.fn(),
  createLocalUser: vi.fn(),
  updateLocalUser: vi.fn(),
  resetLocalUserPassword: vi.fn(),
  deleteLocalUser: vi.fn(),
  countAdmins: vi.fn(),
  getLocalUserById: vi.fn(),
}))

const { editUser } = await import('@/app/actions/admin')
const { requireAuth } = await import('@/lib/auth')
const { getLocalUserById, countAdmins, updateLocalUser } = await import('@/lib/local-auth')

beforeEach(() => {
  vi.clearAllMocks()
  // Acting admin is "admin-self"; the demote target below is a DIFFERENT row.
  vi.mocked(requireAuth).mockResolvedValue({
    isLocalAdmin: true,
    c3paoUser: { id: 'admin-self' },
  } as never)
  vi.mocked(updateLocalUser).mockResolvedValue(true)
})

describe('editUser last-admin guard (L5)', () => {
  it('refuses to demote the sole admin even when targeting another admin row', async () => {
    vi.mocked(getLocalUserById).mockResolvedValue({ id: 'admin-other', role: 'admin' } as never)
    vi.mocked(countAdmins).mockResolvedValue(1)

    const result = await editUser({ id: 'admin-other', role: 'user' })

    expect(result).toEqual({ success: false, error: 'Cannot demote the last admin' })
    expect(updateLocalUser).not.toHaveBeenCalled()
  })

  it('allows demoting an admin when more than one admin exists', async () => {
    vi.mocked(getLocalUserById).mockResolvedValue({ id: 'admin-other', role: 'admin' } as never)
    vi.mocked(countAdmins).mockResolvedValue(2)

    const result = await editUser({ id: 'admin-other', role: 'user' })

    expect(result).toEqual({ success: true })
    expect(updateLocalUser).toHaveBeenCalled()
  })

  it('does not invoke the guard when the target is not currently an admin', async () => {
    vi.mocked(getLocalUserById).mockResolvedValue({ id: 'u1', role: 'user' } as never)

    const result = await editUser({ id: 'u1', role: 'user' })

    expect(result).toEqual({ success: true })
    expect(countAdmins).not.toHaveBeenCalled()
  })
})
