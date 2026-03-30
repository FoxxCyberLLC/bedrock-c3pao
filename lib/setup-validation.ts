/**
 * Setup wizard validation helpers.
 * Extracted for testability — imported by app/actions/setup.ts.
 */

export interface UrlValidationResult {
  valid: boolean
  error?: string
}

const BLOCKED_HOSTNAME_PATTERNS = [
  // AWS metadata / link-local
  /^169\.254\./,
  // Loopback
  /^127\./,
  // RFC-1918 private ranges
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
]

/**
 * Validate an API URL to prevent SSRF attacks.
 * Only allows http/https schemes and blocks known private/reserved IP ranges.
 */
export function validateApiUrl(apiUrl: string): UrlValidationResult {
  if (!apiUrl) {
    return { valid: false, error: 'API URL is required' }
  }

  let url: URL
  try {
    url = new URL(apiUrl)
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { valid: false, error: 'API URL must use http or https scheme' }
  }

  const hostname = url.hostname

  // Block loopback hostnames (URL API returns [::1] with brackets for IPv6)
  if (hostname === 'localhost' || hostname === '::1' || hostname === '[::1]') {
    return { valid: false, error: 'API URL targets a loopback address' }
  }

  // Block reserved/private IP ranges
  for (const pattern of BLOCKED_HOSTNAME_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, error: 'API URL targets a reserved or private address' }
    }
  }

  return { valid: true }
}

/**
 * Validate Bedrock instance API key format.
 * Keys must start with bri- followed by at least one alphanumeric/hyphen/underscore char.
 */
export function isValidApiKey(apiKey: string): boolean {
  return /^bri-[a-zA-Z0-9_-]+$/.test(apiKey)
}
