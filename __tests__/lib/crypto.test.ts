import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomBytes } from 'node:crypto'

// A deterministic 32-byte key (base64) for the round-trip tests.
const TEST_KEY = randomBytes(32).toString('base64')

const { encryptValue, decryptValue, isEncrypted } = await import('@/lib/crypto')

describe('lib/crypto', () => {
  let savedKey: string | undefined

  beforeEach(() => {
    savedKey = process.env.CONFIG_ENCRYPTION_KEY
    process.env.CONFIG_ENCRYPTION_KEY = TEST_KEY
  })

  afterEach(() => {
    if (savedKey === undefined) delete process.env.CONFIG_ENCRYPTION_KEY
    else process.env.CONFIG_ENCRYPTION_KEY = savedKey
  })

  it('round-trips: decryptValue(encryptValue(x)) === x', () => {
    const secret = 'super-secret-AUTH_SECRET-value'
    expect(decryptValue(encryptValue(secret))).toBe(secret)
  })

  it('produces the enc:v1 wire format', () => {
    const blob = encryptValue('x')
    expect(blob).toMatch(/^enc:v1:[^:]+:[^:]+:[^:]+$/)
  })

  it('uses a random IV — two encryptions of the same value differ', () => {
    expect(encryptValue('same')).not.toBe(encryptValue('same'))
  })

  it('tampering with the ciphertext throws (GCM auth)', () => {
    const blob = encryptValue('integrity-protected')
    const parts = blob.split(':') // enc, v1, iv, tag, ct
    const ctBuf = Buffer.from(parts[4], 'base64')
    ctBuf[0] ^= 0xff
    parts[4] = ctBuf.toString('base64')
    expect(() => decryptValue(parts.join(':'))).toThrow()
  })

  it('tampering with the auth tag throws (GCM auth)', () => {
    const blob = encryptValue('integrity-protected')
    const parts = blob.split(':')
    const tagBuf = Buffer.from(parts[3], 'base64')
    tagBuf[0] ^= 0xff
    parts[3] = tagBuf.toString('base64')
    expect(() => decryptValue(parts.join(':'))).toThrow()
  })

  it('isEncrypted detects the enc:v1 prefix', () => {
    expect(isEncrypted('plain')).toBe(false)
    expect(isEncrypted('enc:v1:a:b:c')).toBe(true)
  })

  it('decryptValue is read-through for legacy plaintext (no prefix)', () => {
    expect(decryptValue('legacy-plaintext')).toBe('legacy-plaintext')
  })

  it('accepts a hex-encoded 32-byte key', () => {
    process.env.CONFIG_ENCRYPTION_KEY = randomBytes(32).toString('hex')
    const secret = 'hex-key-secret'
    expect(decryptValue(encryptValue(secret))).toBe(secret)
  })

  it('throws a clear error when the key is missing', () => {
    delete process.env.CONFIG_ENCRYPTION_KEY
    expect(() => encryptValue('x')).toThrow(/CONFIG_ENCRYPTION_KEY/)
  })

  it('throws when the key decodes to fewer than 32 bytes', () => {
    process.env.CONFIG_ENCRYPTION_KEY = Buffer.from('too-short').toString('base64')
    expect(() => encryptValue('x')).toThrow(/32 bytes/)
  })
})
