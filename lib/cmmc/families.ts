/**
 * Canonical list of the 14 CMMC Level 2 / NIST SP 800-171 control families.
 *
 * This is the single source of truth used by:
 *   - The domain-assignment dialog (per-engagement assessor → family mapping)
 *   - The team card chip render
 *   - The workload dashboard "domains assigned / 14" indicator
 *
 * Code order matches the canonical NIST 800-171 family ordering.
 */

export interface CmmcFamily {
  code: string
  name: string
}

export const CMMC_FAMILIES: ReadonlyArray<CmmcFamily> = [
  { code: 'AC', name: 'Access Control' },
  { code: 'AT', name: 'Awareness & Training' },
  { code: 'AU', name: 'Audit & Accountability' },
  { code: 'CM', name: 'Configuration Management' },
  { code: 'IA', name: 'Identification & Authentication' },
  { code: 'IR', name: 'Incident Response' },
  { code: 'MA', name: 'Maintenance' },
  { code: 'MP', name: 'Media Protection' },
  { code: 'PE', name: 'Physical Protection' },
  { code: 'PS', name: 'Personnel Security' },
  { code: 'RA', name: 'Risk Assessment' },
  { code: 'CA', name: 'Security Assessment' },
  { code: 'SC', name: 'System & Comms Protection' },
  { code: 'SI', name: 'System & Information Integrity' },
] as const

export const CMMC_FAMILY_CODES: ReadonlyArray<string> = CMMC_FAMILIES.map(
  (f) => f.code,
)
