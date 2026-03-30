import { describe, it, expect } from 'vitest'
import { validateApiUrl, isValidApiKey } from '@/lib/setup-validation'

describe('validateApiUrl', () => {
  it('accepts valid https URL', () => {
    const result = validateApiUrl('https://api.example.com')
    expect(result.valid).toBe(true)
  })

  it('accepts valid http URL', () => {
    const result = validateApiUrl('http://api.example.com')
    expect(result.valid).toBe(true)
  })

  it('rejects file:// scheme', () => {
    const result = validateApiUrl('file:///etc/passwd')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects ftp:// scheme', () => {
    const result = validateApiUrl('ftp://example.com')
    expect(result.valid).toBe(false)
  })

  it('rejects javascript: scheme', () => {
    const result = validateApiUrl('javascript:alert(1)')
    expect(result.valid).toBe(false)
  })

  it('rejects link-local 169.254.x.x (AWS metadata)', () => {
    const result = validateApiUrl('http://169.254.169.254/latest/meta-data')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects loopback 127.0.0.1', () => {
    const result = validateApiUrl('http://127.0.0.1:8080')
    expect(result.valid).toBe(false)
  })

  it('rejects localhost', () => {
    const result = validateApiUrl('http://localhost:3000')
    expect(result.valid).toBe(false)
  })

  it('rejects IPv6 loopback ::1', () => {
    const result = validateApiUrl('http://[::1]:8080')
    expect(result.valid).toBe(false)
  })

  it('rejects RFC-1918 10.x.x.x', () => {
    const result = validateApiUrl('http://10.0.0.1')
    expect(result.valid).toBe(false)
  })

  it('rejects RFC-1918 192.168.x.x', () => {
    const result = validateApiUrl('http://192.168.1.1')
    expect(result.valid).toBe(false)
  })

  it('rejects RFC-1918 172.16.x.x', () => {
    const result = validateApiUrl('http://172.16.0.1')
    expect(result.valid).toBe(false)
  })

  it('rejects malformed URL', () => {
    const result = validateApiUrl('not-a-url')
    expect(result.valid).toBe(false)
  })

  it('rejects empty string', () => {
    const result = validateApiUrl('')
    expect(result.valid).toBe(false)
  })
})

describe('isValidApiKey', () => {
  it('accepts valid bri- prefixed key', () => {
    expect(isValidApiKey('bri-abc123')).toBe(true)
  })

  it('accepts key with underscores and hyphens', () => {
    expect(isValidApiKey('bri-abc_def-123')).toBe(true)
  })

  it('rejects key without bri- prefix', () => {
    expect(isValidApiKey('abc-123')).toBe(false)
  })

  it('rejects key with spaces', () => {
    expect(isValidApiKey('bri-abc 123')).toBe(false)
  })

  it('rejects key with special chars', () => {
    expect(isValidApiKey('bri-abc!@#')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidApiKey('')).toBe(false)
  })

  it('rejects just the prefix bri-', () => {
    expect(isValidApiKey('bri-')).toBe(false)
  })
})
