import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

// The crypto module uses process.env.ENCRYPTION_KEY_PATH when set, falling back to
// the default data/.encryption-key path. We use this to isolate each test to a temp dir.

describe('lib/crypto', () => {
  let tmpDir: string
  let keyPath: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crypto-test-'))
    keyPath = path.join(tmpDir, '.encryption-key')
    process.env.ENCRYPTION_KEY_PATH = keyPath
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY_PATH
    fs.rmSync(tmpDir, { recursive: true, force: true })
    vi.resetModules()
  })

  async function getCrypto() {
    return import('@/lib/crypto')
  }

  it('encrypt/decrypt roundtrip returns original plaintext', async () => {
    const { encrypt, decrypt } = await getCrypto()
    const plaintext = 'super secret value'
    const ciphertext = encrypt(plaintext)
    expect(decrypt(ciphertext)).toBe(plaintext)
  })

  it('encrypt produces different ciphertext each time (random IV)', async () => {
    const { encrypt } = await getCrypto()
    const a = encrypt('same text')
    const b = encrypt('same text')
    expect(a).not.toBe(b)
  })

  it('encrypt/decrypt roundtrip works with empty string', async () => {
    const { encrypt, decrypt } = await getCrypto()
    expect(decrypt(encrypt(''))).toBe('')
  })

  it('generates new key file when none exists', async () => {
    const { getEncryptionKey } = await getCrypto()
    expect(fs.existsSync(keyPath)).toBe(false)
    const key = getEncryptionKey()
    expect(key.length).toBe(32)
    expect(fs.existsSync(keyPath)).toBe(true)
  })

  it('throws when key file has insecure permissions', async () => {
    const keyHex = crypto.randomBytes(32).toString('hex')
    fs.writeFileSync(keyPath, keyHex)
    // Use chmodSync to bypass umask and set world-readable bits explicitly
    fs.chmodSync(keyPath, 0o644)
    const { getEncryptionKey } = await getCrypto()
    expect(() => getEncryptionKey()).toThrow(/insecure permissions/)
  })

  it('throws when key is wrong length (not 32 bytes)', async () => {
    const shortKey = crypto.randomBytes(16).toString('hex') // 16 bytes = 128-bit
    fs.writeFileSync(keyPath, shortKey, { mode: 0o600 })
    const { getEncryptionKey } = await getCrypto()
    expect(() => getEncryptionKey()).toThrow(/32 bytes/)
  })

  it('loads existing valid key file', async () => {
    const key = crypto.randomBytes(32)
    fs.writeFileSync(keyPath, key.toString('hex'), { mode: 0o600 })
    const { getEncryptionKey } = await getCrypto()
    const loaded = getEncryptionKey()
    expect(loaded.toString('hex')).toBe(key.toString('hex'))
  })
})
