import { describe, it, expect } from 'vitest'
import {
  PROXY_DISPLAY_ALLOWED,
  UPLOAD_ALLOWED,
  isProxyDisplayable,
  isUploadAllowed,
} from '@/lib/evidence-mime-types'

describe('evidence-mime-types', () => {
  describe('PROXY_DISPLAY_ALLOWED', () => {
    it('includes the inline-render-safe types matching the existing OSC proxy', () => {
      // Mirrors app/api/evidence/[engagementId]/[evidenceId]/proxy/route.ts
      // which previously hardcoded these. If you remove or add a type here,
      // update the OSC proxy import path expectations.
      expect(PROXY_DISPLAY_ALLOWED.has('application/pdf')).toBe(true)
      expect(PROXY_DISPLAY_ALLOWED.has('image/png')).toBe(true)
      expect(PROXY_DISPLAY_ALLOWED.has('image/jpeg')).toBe(true)
      expect(PROXY_DISPLAY_ALLOWED.has('image/gif')).toBe(true)
      expect(PROXY_DISPLAY_ALLOWED.has('image/webp')).toBe(true)
      expect(
        PROXY_DISPLAY_ALLOWED.has(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ),
      ).toBe(true)
      expect(PROXY_DISPLAY_ALLOWED.has('application/vnd.ms-excel')).toBe(true)
    })

    it('does not include arbitrary executable or unsafe types', () => {
      expect(PROXY_DISPLAY_ALLOWED.has('application/javascript')).toBe(false)
      expect(PROXY_DISPLAY_ALLOWED.has('text/html')).toBe(false)
      expect(PROXY_DISPLAY_ALLOWED.has('application/x-msdownload')).toBe(false)
    })
  })

  describe('UPLOAD_ALLOWED', () => {
    it('is a superset of PROXY_DISPLAY_ALLOWED', () => {
      for (const t of PROXY_DISPLAY_ALLOWED) {
        expect(UPLOAD_ALLOWED.has(t)).toBe(true)
      }
    })

    it('additionally allows common office document types that download but do not preview', () => {
      expect(UPLOAD_ALLOWED.has('application/msword')).toBe(true)
      expect(
        UPLOAD_ALLOWED.has(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      ).toBe(true)
      expect(UPLOAD_ALLOWED.has('text/csv')).toBe(true)
      expect(UPLOAD_ALLOWED.has('text/plain')).toBe(true)
    })

    it('does not allow obviously dangerous types', () => {
      expect(UPLOAD_ALLOWED.has('application/javascript')).toBe(false)
      expect(UPLOAD_ALLOWED.has('text/html')).toBe(false)
      expect(UPLOAD_ALLOWED.has('application/x-sh')).toBe(false)
    })
  })

  describe('isProxyDisplayable', () => {
    it('returns true for known displayable types', () => {
      expect(isProxyDisplayable('application/pdf')).toBe(true)
      expect(isProxyDisplayable('image/png')).toBe(true)
    })

    it('lowercases the input before comparing', () => {
      expect(isProxyDisplayable('Application/PDF')).toBe(true)
    })

    it('returns false for null, undefined, empty, and unknown types', () => {
      expect(isProxyDisplayable(null)).toBe(false)
      expect(isProxyDisplayable(undefined)).toBe(false)
      expect(isProxyDisplayable('')).toBe(false)
      expect(isProxyDisplayable('application/x-msdownload')).toBe(false)
    })
  })

  describe('isUploadAllowed', () => {
    it('returns true for displayable types', () => {
      expect(isUploadAllowed('application/pdf')).toBe(true)
    })

    it('returns true for office document types', () => {
      expect(isUploadAllowed('application/msword')).toBe(true)
      expect(isUploadAllowed('text/csv')).toBe(true)
    })

    it('returns false for null, undefined, and disallowed types', () => {
      expect(isUploadAllowed(null)).toBe(false)
      expect(isUploadAllowed(undefined)).toBe(false)
      expect(isUploadAllowed('application/javascript')).toBe(false)
    })
  })
})
