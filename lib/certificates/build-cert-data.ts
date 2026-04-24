/**
 * Pure resolver that turns engagement + phase data into a CertificateData
 * payload suitable for the @react-pdf/renderer template.
 *
 * Returns null when no certificate should be issued (no result, FAILED,
 * or non-Level-2 target). The Go API does not yet expose a cert-issuance
 * endpoint, so every certificate produced today is a DRAFT — the
 * `certUid` is locally derived and `isDraft` is always true.
 */

import type { CertificateData } from '@/lib/pdf-templates/cmmc-certificate'

export interface BuildCertDataArgs {
  engagementId: string
  organizationName: string
  packageName: string
  /** engagement.targetLevel — we only mint certs for Level 2 variants today. */
  targetLevel: string
  /** Legacy enum: PASSED | CONDITIONAL | FAILED (or null). */
  assessmentResult: string | null
  /** ISO string from engagement.actualCompletionDate. */
  actualCompletionDate?: string | null
  leadAssessorName: string | null
  c3paoName: string
  /** ISO string from EngagementPhase.poamCloseoutDue. */
  poamCloseoutDate?: string | null
}

const THREE_YEARS_DAYS = 365 * 3
const CONDITIONAL_CLOSEOUT_DAYS = 180

function isLevel2(targetLevel: string): boolean {
  const t = targetLevel.toUpperCase().replace(/[\s_-]/g, '')
  return t.includes('LEVEL2') || t === 'L2' || t === '2'
}

function addDays(date: Date, days: number): Date {
  const out = new Date(date.getTime())
  out.setUTCDate(out.getUTCDate() + days)
  return out
}

function formatYYYYMMDD(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, '0')
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const d = date.getUTCDate().toString().padStart(2, '0')
  return `${y}${m}${d}`
}

function parseDate(input?: string | null): Date | null {
  if (!input) return null
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return null
  return d
}

/** Build the CertificateData payload for the PDF template. */
export function buildCertificateData(
  args: BuildCertDataArgs,
): CertificateData | null {
  const { assessmentResult, targetLevel } = args

  if (!assessmentResult) return null
  const result = assessmentResult.toUpperCase()
  if (result === 'FAILED' || result === 'NO_CMMC_STATUS') return null
  if (!isLevel2(targetLevel)) return null

  let determination: CertificateData['determination']
  if (result === 'PASSED' || result === 'FINAL_LEVEL_2') {
    determination = 'FINAL_LEVEL_2'
  } else if (result === 'CONDITIONAL' || result === 'CONDITIONAL_LEVEL_2') {
    determination = 'CONDITIONAL_LEVEL_2'
  } else {
    return null
  }

  const issuedDate = parseDate(args.actualCompletionDate) ?? new Date()
  const expiryDate =
    determination === 'FINAL_LEVEL_2'
      ? addDays(issuedDate, THREE_YEARS_DAYS)
      : addDays(issuedDate, CONDITIONAL_CLOSEOUT_DAYS)
  const poamCloseoutDate = parseDate(args.poamCloseoutDate)

  const idPrefix = args.engagementId.replace(/-/g, '').slice(0, 8).toUpperCase()
  const certUid = `DRAFT-${idPrefix}-${formatYYYYMMDD(issuedDate)}`

  return {
    organizationName: args.organizationName,
    packageName: args.packageName,
    cmmcLevel: 'Level 2',
    determination,
    issuedDate,
    expiryDate,
    poamCloseoutDate:
      determination === 'CONDITIONAL_LEVEL_2' ? poamCloseoutDate : null,
    leadAssessorName: args.leadAssessorName ?? 'Unassigned',
    c3paoName: args.c3paoName,
    certUid,
    isDraft: true,
  }
}
