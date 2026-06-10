import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'

// start.js is a CommonJS standalone bootstrap. require()-ing it (rather than
// running `node start.js`) means require.main !== module, so bootstrap() does
// NOT run — only the exported helpers are loaded.
const nodeRequire = createRequire(import.meta.url)
const { decryptConfigValue, buildSslConfig, handleBootstrapError, ensureCerts } = nodeRequire(
  '../start.js'
) as {
  decryptConfigValue: (blob: string) => string
  buildSslConfig: (
    databaseUrl: string | undefined,
    caCert: string | undefined
  ) => { ca: string; rejectUnauthorized: true } | undefined
  handleBootstrapError: (err: unknown) => void
  ensureCerts: (fsImpl?: unknown, execImpl?: unknown) => void
}

const { encryptValue } = await import('@/lib/crypto')

describe('start.js decryptConfigValue (CommonJS, cross-compatible with lib/crypto)', () => {
  const KEY = randomBytes(32).toString('base64')
  let saved: string | undefined

  beforeEach(() => {
    saved = process.env.CONFIG_ENCRYPTION_KEY
    process.env.CONFIG_ENCRYPTION_KEY = KEY
  })

  afterEach(() => {
    if (saved === undefined) delete process.env.CONFIG_ENCRYPTION_KEY
    else process.env.CONFIG_ENCRYPTION_KEY = saved
  })

  it('decrypts a value produced by lib/crypto.encryptValue (wire-format cross-compat)', () => {
    const secret = 'shared-AUTH_SECRET-across-runtimes'
    const blob = encryptValue(secret)
    expect(decryptConfigValue(blob)).toBe(secret)
  })

  it('is read-through for legacy plaintext (no enc:v1 prefix)', () => {
    expect(decryptConfigValue('legacy-plaintext')).toBe('legacy-plaintext')
  })

  it('throws on a tampered ciphertext (GCM auth)', () => {
    const blob = encryptValue('integrity-protected')
    const parts = blob.split(':') // enc, v1, iv, tag, ct
    const ct = Buffer.from(parts[4], 'base64')
    ct[0] ^= 0xff
    parts[4] = ct.toString('base64')
    expect(() => decryptConfigValue(parts.join(':'))).toThrow()
  })

  it('throws when CONFIG_ENCRYPTION_KEY is missing', () => {
    const blob = encryptValue('x')
    delete process.env.CONFIG_ENCRYPTION_KEY
    expect(() => decryptConfigValue(blob)).toThrow(/CONFIG_ENCRYPTION_KEY/)
  })
})

describe('start.js buildSslConfig (mirrors lib/db.buildSslConfig)', () => {
  it('returns verified TLS config when sslmode is present and a CA is provided', () => {
    expect(buildSslConfig('postgres://h/db?sslmode=require', 'CA-PEM')).toEqual({
      ca: 'CA-PEM',
      rejectUnauthorized: true,
    })
  })

  it('throws (fail-closed) when sslmode is present but no CA', () => {
    expect(() => buildSslConfig('postgres://h/db?sslmode=require', undefined)).toThrow(
      /DATABASE_CA_CERT/
    )
  })

  it('returns undefined when the URL has no sslmode', () => {
    expect(buildSslConfig('postgres://h/db', 'CA-PEM')).toBeUndefined()
  })
})

describe('start.js handleBootstrapError', () => {
  it('logs and exits the process with code 1', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      handleBootstrapError(new Error('bootstrap boom'))
      expect(exitSpy).toHaveBeenCalledWith(1)
      expect(errSpy).toHaveBeenCalled()
    } finally {
      exitSpy.mockRestore()
      errSpy.mockRestore()
    }
  })
})

describe('start.js ensureCerts perms (M5)', () => {
  it('sets dir 0700 and key 0600 unconditionally, even for pre-existing certs', () => {
    const mkdir: Array<[string, unknown]> = []
    const chmod: Array<[string, number]> = []
    const fakeFs = {
      mkdirSync: (p: string, opts: unknown) => mkdir.push([p, opts]),
      existsSync: () => true, // certs already exist (e.g. mounted) → no openssl
      chmodSync: (p: string, mode: number) => chmod.push([p, mode]),
      readFileSync: () => Buffer.from(''),
    }
    const fakeExec = vi.fn()
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      ensureCerts(fakeFs, fakeExec)
    } finally {
      logSpy.mockRestore()
    }

    expect(fakeExec).not.toHaveBeenCalled()
    expect(mkdir[0][1]).toMatchObject({ recursive: true, mode: 0o700 })
    const modes = chmod.map(([, m]) => m)
    expect(modes).toContain(0o600) // key
    expect(modes).toContain(0o700) // dir
  })
})
