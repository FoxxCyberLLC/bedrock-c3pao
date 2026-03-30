import { describe, it, expect } from 'vitest'
import { isSafeRedirectUrl } from '@/lib/safe-redirect'

describe('isSafeRedirectUrl (H7: open redirect prevention)', () => {
  it('allows root-relative paths', () => {
    expect(isSafeRedirectUrl('/engagements/123')).toBe(true)
    expect(isSafeRedirectUrl('/admin')).toBe(true)
    expect(isSafeRedirectUrl('/')).toBe(true)
  })

  it('rejects absolute http/https URLs', () => {
    expect(isSafeRedirectUrl('http://evil.com')).toBe(false)
    expect(isSafeRedirectUrl('https://evil.com/steal')).toBe(false)
    expect(isSafeRedirectUrl('HTTP://evil.com')).toBe(false) // case-insensitive
  })

  it('rejects protocol-relative URLs', () => {
    expect(isSafeRedirectUrl('//evil.com')).toBe(false)
    expect(isSafeRedirectUrl('//evil.com/page')).toBe(false)
  })

  it('rejects javascript: URLs', () => {
    expect(isSafeRedirectUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeRedirectUrl('JAVASCRIPT:alert(1)')).toBe(false)
  })

  it('rejects data: URLs', () => {
    expect(isSafeRedirectUrl('data:text/html,<h1>XSS</h1>')).toBe(false)
  })

  it('rejects null, undefined, and empty string', () => {
    expect(isSafeRedirectUrl(null)).toBe(false)
    expect(isSafeRedirectUrl(undefined)).toBe(false)
    expect(isSafeRedirectUrl('')).toBe(false)
  })

  it('rejects relative paths without leading slash (ambiguous)', () => {
    expect(isSafeRedirectUrl('evil.com')).toBe(false)
    expect(isSafeRedirectUrl('some/path')).toBe(false)
  })
})
