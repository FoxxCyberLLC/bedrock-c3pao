/**
 * H7: Open redirect prevention.
 * Validates that a URL is a safe, root-relative path that cannot redirect to an external site.
 */
export function isSafeRedirectUrl(url: string | null | undefined): boolean {
  if (!url) return false

  // Must start with exactly one '/' (not '//' which is protocol-relative)
  if (!url.startsWith('/') || url.startsWith('//')) return false

  // Block any URL that contains a protocol scheme (e.g., injected via encoded chars)
  const lower = url.toLowerCase()
  if (/^[a-z][a-z0-9+\-.]*:/i.test(lower)) return false

  return true
}
