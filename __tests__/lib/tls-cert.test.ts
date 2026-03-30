/**
 * H8: TLS certificate generation hardening test.
 * Reads start.js and verifies the openssl command uses P-384 ECDSA
 * and a reasonable validity period (≤ 3 years).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const startJs = readFileSync(resolve(__dirname, '../../start.js'), 'utf-8')

describe('TLS certificate generation (H8)', () => {
  it('uses ECDSA P-384 instead of RSA-2048', () => {
    expect(startJs).toContain('ec_paramgen_curve:P-384')
    expect(startJs).not.toContain('rsa:2048')
    expect(startJs).not.toContain('rsa:')
  })

  it('uses -newkey ec flag for ECDSA key generation', () => {
    expect(startJs).toContain('-newkey ec')
  })

  it('uses a validity period of no more than 825 days (~2.25 years)', () => {
    // Extract the -days value from the openssl command
    const match = startJs.match(/-days\s+(\d+)/)
    expect(match).not.toBeNull()
    const days = parseInt(match![1], 10)
    expect(days).toBeLessThanOrEqual(825)
  })

  it('sets private key permissions to 0o600 after generation', () => {
    expect(startJs).toContain('chmodSync(TLS_KEY, 0o600)')
  })
})
