import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'

// start.js is a CommonJS standalone bootstrap. require()-ing it (rather than
// running `node start.js`) means require.main !== module, so bootstrap() does
// NOT run — only the exported helpers are loaded.
const nodeRequire = createRequire(import.meta.url)
const { decryptConfigValue, buildSslConfig } = nodeRequire('../start.js') as {
  decryptConfigValue: (blob: string) => string
  buildSslConfig: (
    databaseUrl: string | undefined,
    caCert: string | undefined
  ) => { ca: string; rejectUnauthorized: true } | undefined
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
