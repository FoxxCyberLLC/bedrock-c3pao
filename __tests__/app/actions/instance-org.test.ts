import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/api-client', () => ({
  fetchInstanceOrg: vi.fn(),
  fetchInstanceUsers: vi.fn(),
  createInstanceUser: vi.fn(),
  updateInstanceUser: vi.fn(),
  deleteInstanceUser: vi.fn(),
}))

const { requireAuth } = await import('@/lib/auth')
const { createInstanceUser } = await import('@/lib/api-client')

async function getHandler() {
  const mod = await import('@/app/actions/instance-org')
  return mod
}

// Simulate an admin session
beforeEach(() => {
  vi.mocked(requireAuth).mockResolvedValue({ apiToken: 'tok', email: 'admin@test.com', isLocalAdmin: true } as any)
  vi.mocked(createInstanceUser).mockResolvedValue({ id: '1', name: 'Test User', email: 'u@test.com' } as any)
})

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

describe('addInstanceUser (H15: input validation)', () => {
  it('succeeds with valid required fields', async () => {
    const { addInstanceUser } = await getHandler()
    const fd = makeFormData({ name: 'Alice Smith', email: 'alice@example.com', password: 'SecureP@ss12' })
    const result = await addInstanceUser(fd)
    expect(result.success).toBe(true)
  })

  it('returns error when name is missing (H15)', async () => {
    const { addInstanceUser } = await getHandler()
    const fd = makeFormData({ email: 'alice@example.com', password: 'SecureP@ss12' })
    const result = await addInstanceUser(fd)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/name/i)
  })

  it('returns error when email is missing (H15)', async () => {
    const { addInstanceUser } = await getHandler()
    const fd = makeFormData({ name: 'Alice Smith', password: 'SecureP@ss12' })
    const result = await addInstanceUser(fd)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/email/i)
  })

  it('returns error when email format is invalid (H15)', async () => {
    const { addInstanceUser } = await getHandler()
    const fd = makeFormData({ name: 'Alice Smith', email: 'not-an-email', password: 'SecureP@ss12' })
    const result = await addInstanceUser(fd)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/email/i)
  })

  it('returns error when password is missing (H15)', async () => {
    const { addInstanceUser } = await getHandler()
    const fd = makeFormData({ name: 'Alice Smith', email: 'alice@example.com' })
    const result = await addInstanceUser(fd)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/password/i)
  })

  it('returns error when password is too short (< 12 chars) (H15)', async () => {
    const { addInstanceUser } = await getHandler()
    const fd = makeFormData({ name: 'Alice Smith', email: 'alice@example.com', password: 'Short1!' })
    const result = await addInstanceUser(fd)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/12 characters/i)
  })
})
