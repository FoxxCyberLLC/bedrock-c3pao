/**
 * Shared MIME type allow-lists for evidence handling.
 *
 * - PROXY_DISPLAY_ALLOWED — types we will inline-render via the evidence
 *   proxy (browser-native preview). Anything outside this set is forced to
 *   `application/octet-stream` to prevent MIME-sniffing attacks.
 * - UPLOAD_ALLOWED — types we accept on upload (superset; office docs that
 *   download but do not preview inline are still allowed to upload).
 */

export const PROXY_DISPLAY_ALLOWED: ReadonlySet<string> = new Set<string>([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
])

export const UPLOAD_ALLOWED: ReadonlySet<string> = new Set<string>([
  ...PROXY_DISPLAY_ALLOWED,
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'text/plain',
])

export function isProxyDisplayable(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false
  return PROXY_DISPLAY_ALLOWED.has(mimeType.toLowerCase())
}

export function isUploadAllowed(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false
  return UPLOAD_ALLOWED.has(mimeType.toLowerCase())
}
