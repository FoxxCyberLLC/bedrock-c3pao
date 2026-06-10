import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ setSession: vi.fn(), deleteSession: vi.fn() }))
vi.mock('@/lib/api-client', () => ({ apiLogin: vi.fn() }))
vi.mock('@/lib/local-auth', () => ({ authenticateLocalUser: vi.fn() }))
vi.mock('@/lib/login-attempts', () => ({
  isLockedOut: vi.fn(),
  recordFailedLogin: vi.fn(),
  clearLoginAttempts: vi.fn(),
}))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

const { login } = await import('@/app/actions/auth')
const { authenticateLocalUser } = await import('@/lib/local-auth')
const { apiLogin } = await import('@/lib/api-client')
const { setSession } = await import('@/lib/auth')
const { isLockedOut, recordFailedLogin, clearLoginAttempts } = await import('@/lib/login-attempts')

function form(email: string, password: string): FormData {
  const fd = new FormData()
  fd.set('email', email)
  fd.set('password', password)
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isLockedOut).mockResolvedValue({ locked: false })
})

describe('login lockout (AC.L2-3.1.8)', () => {
  it('rejects as locked without checking credentials, even with correct password', async () => {
    vi.mocked(isLockedOut).mockResolvedValue({ locked: true, retryAfterSec: 600 })

    const result = await login(form('a@b.com', 'correct-password'))

    expect(result).toMatchObject({ success: false, locked: true })
    expect(authenticateLocalUser).not.toHaveBeenCalled()
    expect(apiLogin).not.toHaveBeenCalled()
    expect(setSession).not.toHaveBeenCalled()
  })

  it('records a failed attempt when both auth paths fail', async () => {
    vi.mocked(authenticateLocalUser).mockResolvedValue(null)
    vi.mocked(apiLogin).mockRejectedValue(new Error('bad creds'))

    const result = await login(form('a@b.com', 'wrong'))

    expect(result).toMatchObject({ success: false, error: 'Invalid email or password' })
    expect(recordFailedLogin).toHaveBeenCalledWith('a@b.com')
    expect(clearLoginAttempts).not.toHaveBeenCalled()
  })

  it('clears the counter on a successful local-admin login', async () => {
    vi.mocked(authenticateLocalUser).mockResolvedValue({
      id: 'local-1',
      email: 'a@b.com',
      name: 'Admin',
      role: 'admin',
      created_at: 'now',
    })

    const result = await login(form('a@b.com', 'right'))

    expect(result).toMatchObject({ success: true, isLocalAdmin: true })
    expect(clearLoginAttempts).toHaveBeenCalledWith('a@b.com')
    expect(recordFailedLogin).not.toHaveBeenCalled()
  })

  it('clears the counter on a successful Go-API login', async () => {
    vi.mocked(authenticateLocalUser).mockResolvedValue(null)
    vi.mocked(apiLogin).mockResolvedValue({
      userId: 'u1',
      email: 'a@b.com',
      name: 'Assessor',
      orgId: 'org1',
      orgName: 'Org',
      isLeadAssessor: false,
      token: 'tok',
    } as never)

    const result = await login(form('a@b.com', 'right'))

    expect(result).toMatchObject({ success: true })
    expect(clearLoginAttempts).toHaveBeenCalledWith('a@b.com')
    expect(recordFailedLogin).not.toHaveBeenCalled()
  })
})
