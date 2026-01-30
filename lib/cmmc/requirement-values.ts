/**
 * CMMC Level 2 Requirement Values
 *
 * Based on CMMC Level 2 Assessment Results Template Version 3.8
 *
 * This is the authoritative source for:
 * - Requirement point values (1, 3, or 5 points)
 * - POA&M eligibility (whether a requirement can be in a Plan of Action & Milestones)
 *
 * Point values reflect security criticality:
 * - 5 points: Critical security controls (cannot be in POA&M)
 * - 3 points: Important security controls (typically cannot be in POA&M)
 * - 1 point: Supporting security controls (can typically be in POA&M)
 *
 * Note: Uses NIST SP 800-171 R3 requirement ID format (e.g., "03.01.01")
 * which maps to CMMC format (e.g., "AC.L2-3.1.1")
 */

export interface CMMCRequirementValue {
  /** Point value for SPRS scoring (1, 3, or 5) */
  value: number
  /** Display value (may include conditions like "3 or 5") */
  displayValue: string
  /** Whether this requirement can be placed in a POA&M */
  poamAllowed: boolean
  /** POA&M condition notes (for conditional POA&M eligibility) */
  poamCondition?: string
}

/**
 * All 110 CMMC Level 2 requirement values
 * Using NIST SP 800-171 R3 ID format (03.xx.xx)
 * Based on official eMASS template v3.8
 */
export const cmmcRequirementValues: Record<string, CMMCRequirementValue> = {
  // ========================================
  // Access Control (AC) - 03.01.xx - 22 requirements
  // ========================================
  '03.01.01': { value: 5, displayValue: '5', poamAllowed: false },  // AC.L2-3.1.1
  '03.01.02': { value: 5, displayValue: '5', poamAllowed: false },  // AC.L2-3.1.2
  '03.01.03': { value: 1, displayValue: '1', poamAllowed: true },   // AC.L2-3.1.3
  '03.01.04': { value: 1, displayValue: '1', poamAllowed: true },   // AC.L2-3.1.4
  '03.01.05': { value: 3, displayValue: '3', poamAllowed: false },  // AC.L2-3.1.5
  '03.01.06': { value: 1, displayValue: '1', poamAllowed: true },   // AC.L2-3.1.6
  '03.01.07': { value: 1, displayValue: '1', poamAllowed: true },   // AC.L2-3.1.7
  '03.01.08': { value: 1, displayValue: '1', poamAllowed: true },   // AC.L2-3.1.8
  '03.01.09': { value: 1, displayValue: '1', poamAllowed: true },   // AC.L2-3.1.9
  '03.01.10': { value: 1, displayValue: '1', poamAllowed: true },   // AC.L2-3.1.10
  '03.01.11': { value: 1, displayValue: '1', poamAllowed: true },   // AC.L2-3.1.11
  '03.01.12': { value: 5, displayValue: '5', poamAllowed: false },  // AC.L2-3.1.12
  '03.01.13': { value: 5, displayValue: '5', poamAllowed: false },  // AC.L2-3.1.13
  '03.01.14': { value: 1, displayValue: '1', poamAllowed: true },   // AC.L2-3.1.14
  '03.01.15': { value: 1, displayValue: '1', poamAllowed: true },   // AC.L2-3.1.15
  '03.01.16': { value: 5, displayValue: '5', poamAllowed: false },  // AC.L2-3.1.16
  '03.01.17': { value: 5, displayValue: '5', poamAllowed: false },  // AC.L2-3.1.17
  '03.01.18': { value: 5, displayValue: '5', poamAllowed: false },  // AC.L2-3.1.18
  '03.01.19': { value: 3, displayValue: '3', poamAllowed: false },  // AC.L2-3.1.19
  '03.01.20': { value: 1, displayValue: '1', poamAllowed: false },  // AC.L2-3.1.20
  '03.01.21': { value: 1, displayValue: '1', poamAllowed: true },   // AC.L2-3.1.21
  '03.01.22': { value: 1, displayValue: '1', poamAllowed: false },  // AC.L2-3.1.22

  // ========================================
  // Awareness and Training (AT) - 03.02.xx - 3 requirements
  // ========================================
  '03.02.01': { value: 5, displayValue: '5', poamAllowed: false },  // AT.L2-3.2.1
  '03.02.02': { value: 5, displayValue: '5', poamAllowed: false },  // AT.L2-3.2.2
  '03.02.03': { value: 1, displayValue: '1', poamAllowed: true },   // AT.L2-3.2.3

  // ========================================
  // Audit and Accountability (AU) - 03.03.xx - 9 requirements
  // ========================================
  '03.03.01': { value: 5, displayValue: '5', poamAllowed: false },  // AU.L2-3.3.1
  '03.03.02': { value: 3, displayValue: '3', poamAllowed: false },  // AU.L2-3.3.2
  '03.03.03': { value: 1, displayValue: '1', poamAllowed: true },   // AU.L2-3.3.3
  '03.03.04': { value: 1, displayValue: '1', poamAllowed: true },   // AU.L2-3.3.4
  '03.03.05': { value: 5, displayValue: '5', poamAllowed: false },  // AU.L2-3.3.5
  '03.03.06': { value: 1, displayValue: '1', poamAllowed: true },   // AU.L2-3.3.6
  '03.03.07': { value: 1, displayValue: '1', poamAllowed: true },   // AU.L2-3.3.7
  '03.03.08': { value: 1, displayValue: '1', poamAllowed: true },   // AU.L2-3.3.8
  '03.03.09': { value: 1, displayValue: '1', poamAllowed: true },   // AU.L2-3.3.9

  // ========================================
  // Configuration Management (CM) - 03.04.xx - 9 requirements
  // ========================================
  '03.04.01': { value: 5, displayValue: '5', poamAllowed: false },  // CM.L2-3.4.1
  '03.04.02': { value: 5, displayValue: '5', poamAllowed: false },  // CM.L2-3.4.2
  '03.04.03': { value: 1, displayValue: '1', poamAllowed: true },   // CM.L2-3.4.3
  '03.04.04': { value: 1, displayValue: '1', poamAllowed: true },   // CM.L2-3.4.4
  '03.04.05': { value: 5, displayValue: '5', poamAllowed: false },  // CM.L2-3.4.5
  '03.04.06': { value: 5, displayValue: '5', poamAllowed: false },  // CM.L2-3.4.6
  '03.04.07': { value: 5, displayValue: '5', poamAllowed: false },  // CM.L2-3.4.7
  '03.04.08': { value: 5, displayValue: '5', poamAllowed: false },  // CM.L2-3.4.8
  '03.04.09': { value: 1, displayValue: '1', poamAllowed: true },   // CM.L2-3.4.9

  // ========================================
  // Identification and Authentication (IA) - 03.05.xx - 11 requirements
  // ========================================
  '03.05.01': { value: 5, displayValue: '5', poamAllowed: false },  // IA.L2-3.5.1
  '03.05.02': { value: 5, displayValue: '5', poamAllowed: false },  // IA.L2-3.5.2
  '03.05.03': {                                                      // IA.L2-3.5.3
    value: 5, // Use worst-case for scoring
    displayValue: '3 or 5',
    poamAllowed: false,
    poamCondition: '3 if MFA is implemented only for remote and privileged users; 5 if MFA is not implemented for any users'
  },
  '03.05.04': { value: 1, displayValue: '1', poamAllowed: true },   // IA.L2-3.5.4
  '03.05.05': { value: 1, displayValue: '1', poamAllowed: true },   // IA.L2-3.5.5
  '03.05.06': { value: 1, displayValue: '1', poamAllowed: true },   // IA.L2-3.5.6
  '03.05.07': { value: 1, displayValue: '1', poamAllowed: true },   // IA.L2-3.5.7
  '03.05.08': { value: 1, displayValue: '1', poamAllowed: true },   // IA.L2-3.5.8
  '03.05.09': { value: 1, displayValue: '1', poamAllowed: true },   // IA.L2-3.5.9
  '03.05.10': { value: 5, displayValue: '5', poamAllowed: false },  // IA.L2-3.5.10
  '03.05.11': { value: 1, displayValue: '1', poamAllowed: true },   // IA.L2-3.5.11

  // ========================================
  // Incident Response (IR) - 03.06.xx - 3 requirements
  // ========================================
  '03.06.01': { value: 5, displayValue: '5', poamAllowed: false },  // IR.L2-3.6.1
  '03.06.02': { value: 5, displayValue: '5', poamAllowed: false },  // IR.L2-3.6.2
  '03.06.03': { value: 1, displayValue: '1', poamAllowed: true },   // IR.L2-3.6.3

  // ========================================
  // Maintenance (MA) - 03.07.xx - 6 requirements
  // ========================================
  '03.07.01': { value: 3, displayValue: '3', poamAllowed: false },  // MA.L2-3.7.1
  '03.07.02': { value: 5, displayValue: '5', poamAllowed: false },  // MA.L2-3.7.2
  '03.07.03': { value: 1, displayValue: '1', poamAllowed: true },   // MA.L2-3.7.3
  '03.07.04': { value: 3, displayValue: '3', poamAllowed: false },  // MA.L2-3.7.4
  '03.07.05': { value: 5, displayValue: '5', poamAllowed: false },  // MA.L2-3.7.5
  '03.07.06': { value: 1, displayValue: '1', poamAllowed: true },   // MA.L2-3.7.6

  // ========================================
  // Media Protection (MP) - 03.08.xx - 9 requirements
  // ========================================
  '03.08.01': { value: 3, displayValue: '3', poamAllowed: false },  // MP.L2-3.8.1
  '03.08.02': { value: 3, displayValue: '3', poamAllowed: false },  // MP.L2-3.8.2
  '03.08.03': { value: 5, displayValue: '5', poamAllowed: false },  // MP.L2-3.8.3
  '03.08.04': { value: 1, displayValue: '1', poamAllowed: true },   // MP.L2-3.8.4
  '03.08.05': { value: 1, displayValue: '1', poamAllowed: true },   // MP.L2-3.8.5
  '03.08.06': { value: 1, displayValue: '1', poamAllowed: true },   // MP.L2-3.8.6
  '03.08.07': { value: 5, displayValue: '5', poamAllowed: false },  // MP.L2-3.8.7
  '03.08.08': { value: 3, displayValue: '3', poamAllowed: false },  // MP.L2-3.8.8
  '03.08.09': { value: 1, displayValue: '1', poamAllowed: true },   // MP.L2-3.8.9

  // ========================================
  // Personnel Security (PS) - 03.09.xx - 2 requirements
  // ========================================
  '03.09.01': { value: 3, displayValue: '3', poamAllowed: false },  // PS.L2-3.9.1
  '03.09.02': { value: 5, displayValue: '5', poamAllowed: false },  // PS.L2-3.9.2

  // ========================================
  // Physical Protection (PE) - 03.10.xx - 6 requirements
  // ========================================
  '03.10.01': { value: 5, displayValue: '5', poamAllowed: false },  // PE.L2-3.10.1
  '03.10.02': { value: 5, displayValue: '5', poamAllowed: false },  // PE.L2-3.10.2
  '03.10.03': { value: 1, displayValue: '1', poamAllowed: false },  // PE.L2-3.10.3
  '03.10.04': { value: 1, displayValue: '1', poamAllowed: false },  // PE.L2-3.10.4
  '03.10.05': { value: 1, displayValue: '1', poamAllowed: false },  // PE.L2-3.10.5
  '03.10.06': { value: 1, displayValue: '1', poamAllowed: true },   // PE.L2-3.10.6

  // ========================================
  // Risk Assessment (RA) - 03.11.xx - 3 requirements
  // ========================================
  '03.11.01': { value: 3, displayValue: '3', poamAllowed: false },  // RA.L2-3.11.1
  '03.11.02': { value: 5, displayValue: '5', poamAllowed: false },  // RA.L2-3.11.2
  '03.11.03': { value: 1, displayValue: '1', poamAllowed: true },   // RA.L2-3.11.3

  // ========================================
  // Security Assessment (CA) - 03.12.xx - 4 requirements
  // ========================================
  '03.12.01': { value: 5, displayValue: '5', poamAllowed: false },  // CA.L2-3.12.1
  '03.12.02': { value: 3, displayValue: '3', poamAllowed: false },  // CA.L2-3.12.2
  '03.12.03': { value: 5, displayValue: '5', poamAllowed: false },  // CA.L2-3.12.3
  '03.12.04': {                                                      // CA.L2-3.12.4
    value: 0, // N/A - must be Met for certification
    displayValue: 'N/A',
    poamAllowed: false,
    poamCondition: 'This requirement must be Met to receive CMMC Conditional or Final Level 2; if Not Met, no score is assigned'
  },

  // ========================================
  // System and Communications Protection (SC) - 03.13.xx - 16 requirements
  // ========================================
  '03.13.01': { value: 5, displayValue: '5', poamAllowed: false },  // SC.L2-3.13.1
  '03.13.02': { value: 5, displayValue: '5', poamAllowed: false },  // SC.L2-3.13.2
  '03.13.03': { value: 1, displayValue: '1', poamAllowed: true },   // SC.L2-3.13.3
  '03.13.04': { value: 1, displayValue: '1', poamAllowed: true },   // SC.L2-3.13.4
  '03.13.05': { value: 5, displayValue: '5', poamAllowed: false },  // SC.L2-3.13.5
  '03.13.06': { value: 5, displayValue: '5', poamAllowed: false },  // SC.L2-3.13.6
  '03.13.07': { value: 1, displayValue: '1', poamAllowed: true },   // SC.L2-3.13.7
  '03.13.08': { value: 3, displayValue: '3', poamAllowed: false },  // SC.L2-3.13.8
  '03.13.09': { value: 1, displayValue: '1', poamAllowed: true },   // SC.L2-3.13.9
  '03.13.10': { value: 1, displayValue: '1', poamAllowed: true },   // SC.L2-3.13.10
  '03.13.11': {                                                      // SC.L2-3.13.11
    value: 5, // Use worst-case for scoring
    displayValue: '3 or 5',
    poamAllowed: true, // Conditional - Yes if value is 3, No if value is 5
    poamCondition: '3 if encryption is employed but not FIPS validated (POA&M allowed); 5 if encryption is not employed (POA&M not allowed)'
  },
  '03.13.12': { value: 1, displayValue: '1', poamAllowed: true },   // SC.L2-3.13.12
  '03.13.13': { value: 1, displayValue: '1', poamAllowed: true },   // SC.L2-3.13.13
  '03.13.14': { value: 1, displayValue: '1', poamAllowed: true },   // SC.L2-3.13.14
  '03.13.15': { value: 5, displayValue: '5', poamAllowed: false },  // SC.L2-3.13.15
  '03.13.16': { value: 1, displayValue: '1', poamAllowed: true },   // SC.L2-3.13.16

  // ========================================
  // System and Information Integrity (SI) - 03.14.xx - 7 requirements
  // ========================================
  '03.14.01': { value: 5, displayValue: '5', poamAllowed: false },  // SI.L2-3.14.1
  '03.14.02': { value: 5, displayValue: '5', poamAllowed: false },  // SI.L2-3.14.2
  '03.14.03': { value: 5, displayValue: '5', poamAllowed: false },  // SI.L2-3.14.3
  '03.14.04': { value: 5, displayValue: '5', poamAllowed: false },  // SI.L2-3.14.4
  '03.14.05': { value: 3, displayValue: '3', poamAllowed: false },  // SI.L2-3.14.5
  '03.14.06': { value: 5, displayValue: '5', poamAllowed: false },  // SI.L2-3.14.6
  '03.14.07': { value: 3, displayValue: '3', poamAllowed: false },  // SI.L2-3.14.7
}

/**
 * NIST family code to CMMC family code mapping
 */
const nistFamilyToCmmc: Record<string, string> = {
  '01': 'AC',  // Access Control
  '02': 'AT',  // Awareness and Training
  '03': 'AU',  // Audit and Accountability
  '04': 'CM',  // Configuration Management
  '05': 'IA',  // Identification and Authentication
  '06': 'IR',  // Incident Response
  '07': 'MA',  // Maintenance
  '08': 'MP',  // Media Protection
  '09': 'PS',  // Personnel Security
  '10': 'PE',  // Physical Protection
  '11': 'RA',  // Risk Assessment
  '12': 'CA',  // Security Assessment (note: NIST uses SA, CMMC uses CA)
  '13': 'SC',  // System and Communications Protection
  '14': 'SI',  // System and Information Integrity
}

/**
 * Convert NIST format ID (03.01.01) to CMMC display format (AC.L2-3.1.1)
 * This is the format shown in eMASS templates and familiar to assessors
 */
export function getCmmcDisplayId(nistId: string, familyCode?: string): string {
  // If already in CMMC format, return as-is
  if (nistId.includes('.L2-')) {
    return nistId
  }

  // Parse NIST format: 03.XX.YY
  const parts = nistId.split('.')
  if (parts.length !== 3 || parts[0] !== '03') {
    return nistId // Return as-is if not standard format
  }

  const familyNum = parts[1] // e.g., "01"
  const reqNum = parts[2]    // e.g., "01"

  // Get CMMC family code from mapping or use provided familyCode
  const cmmcFamily = familyCode || nistFamilyToCmmc[familyNum]
  if (!cmmcFamily) {
    return nistId // Return as-is if unknown family
  }

  // Convert to CMMC format: remove leading zeros
  // 03.01.01 -> 3.1.1
  const cmmcNumber = `3.${parseInt(familyNum, 10)}.${parseInt(reqNum, 10)}`

  return `${cmmcFamily}.L2-${cmmcNumber}`
}

/**
 * CMMC to NIST ID mapping for eMASS export (CMMC format -> NIST format)
 */
const cmmcToNistMap: Record<string, string> = {
  'AC.L2-3.1.1': '03.01.01', 'AC.L2-3.1.2': '03.01.02', 'AC.L2-3.1.3': '03.01.03',
  'AC.L2-3.1.4': '03.01.04', 'AC.L2-3.1.5': '03.01.05', 'AC.L2-3.1.6': '03.01.06',
  'AC.L2-3.1.7': '03.01.07', 'AC.L2-3.1.8': '03.01.08', 'AC.L2-3.1.9': '03.01.09',
  'AC.L2-3.1.10': '03.01.10', 'AC.L2-3.1.11': '03.01.11', 'AC.L2-3.1.12': '03.01.12',
  'AC.L2-3.1.13': '03.01.13', 'AC.L2-3.1.14': '03.01.14', 'AC.L2-3.1.15': '03.01.15',
  'AC.L2-3.1.16': '03.01.16', 'AC.L2-3.1.17': '03.01.17', 'AC.L2-3.1.18': '03.01.18',
  'AC.L2-3.1.19': '03.01.19', 'AC.L2-3.1.20': '03.01.20', 'AC.L2-3.1.21': '03.01.21',
  'AC.L2-3.1.22': '03.01.22',
  'AT.L2-3.2.1': '03.02.01', 'AT.L2-3.2.2': '03.02.02', 'AT.L2-3.2.3': '03.02.03',
  'AU.L2-3.3.1': '03.03.01', 'AU.L2-3.3.2': '03.03.02', 'AU.L2-3.3.3': '03.03.03',
  'AU.L2-3.3.4': '03.03.04', 'AU.L2-3.3.5': '03.03.05', 'AU.L2-3.3.6': '03.03.06',
  'AU.L2-3.3.7': '03.03.07', 'AU.L2-3.3.8': '03.03.08', 'AU.L2-3.3.9': '03.03.09',
  'CM.L2-3.4.1': '03.04.01', 'CM.L2-3.4.2': '03.04.02', 'CM.L2-3.4.3': '03.04.03',
  'CM.L2-3.4.4': '03.04.04', 'CM.L2-3.4.5': '03.04.05', 'CM.L2-3.4.6': '03.04.06',
  'CM.L2-3.4.7': '03.04.07', 'CM.L2-3.4.8': '03.04.08', 'CM.L2-3.4.9': '03.04.09',
  'IA.L2-3.5.1': '03.05.01', 'IA.L2-3.5.2': '03.05.02', 'IA.L2-3.5.3': '03.05.03',
  'IA.L2-3.5.4': '03.05.04', 'IA.L2-3.5.5': '03.05.05', 'IA.L2-3.5.6': '03.05.06',
  'IA.L2-3.5.7': '03.05.07', 'IA.L2-3.5.8': '03.05.08', 'IA.L2-3.5.9': '03.05.09',
  'IA.L2-3.5.10': '03.05.10', 'IA.L2-3.5.11': '03.05.11',
  'IR.L2-3.6.1': '03.06.01', 'IR.L2-3.6.2': '03.06.02', 'IR.L2-3.6.3': '03.06.03',
  'MA.L2-3.7.1': '03.07.01', 'MA.L2-3.7.2': '03.07.02', 'MA.L2-3.7.3': '03.07.03',
  'MA.L2-3.7.4': '03.07.04', 'MA.L2-3.7.5': '03.07.05', 'MA.L2-3.7.6': '03.07.06',
  'MP.L2-3.8.1': '03.08.01', 'MP.L2-3.8.2': '03.08.02', 'MP.L2-3.8.3': '03.08.03',
  'MP.L2-3.8.4': '03.08.04', 'MP.L2-3.8.5': '03.08.05', 'MP.L2-3.8.6': '03.08.06',
  'MP.L2-3.8.7': '03.08.07', 'MP.L2-3.8.8': '03.08.08', 'MP.L2-3.8.9': '03.08.09',
  'PS.L2-3.9.1': '03.09.01', 'PS.L2-3.9.2': '03.09.02',
  'PE.L2-3.10.1': '03.10.01', 'PE.L2-3.10.2': '03.10.02', 'PE.L2-3.10.3': '03.10.03',
  'PE.L2-3.10.4': '03.10.04', 'PE.L2-3.10.5': '03.10.05', 'PE.L2-3.10.6': '03.10.06',
  'RA.L2-3.11.1': '03.11.01', 'RA.L2-3.11.2': '03.11.02', 'RA.L2-3.11.3': '03.11.03',
  'CA.L2-3.12.1': '03.12.01', 'CA.L2-3.12.2': '03.12.02', 'CA.L2-3.12.3': '03.12.03',
  'CA.L2-3.12.4': '03.12.04',
  'SC.L2-3.13.1': '03.13.01', 'SC.L2-3.13.2': '03.13.02', 'SC.L2-3.13.3': '03.13.03',
  'SC.L2-3.13.4': '03.13.04', 'SC.L2-3.13.5': '03.13.05', 'SC.L2-3.13.6': '03.13.06',
  'SC.L2-3.13.7': '03.13.07', 'SC.L2-3.13.8': '03.13.08', 'SC.L2-3.13.9': '03.13.09',
  'SC.L2-3.13.10': '03.13.10', 'SC.L2-3.13.11': '03.13.11', 'SC.L2-3.13.12': '03.13.12',
  'SC.L2-3.13.13': '03.13.13', 'SC.L2-3.13.14': '03.13.14', 'SC.L2-3.13.15': '03.13.15',
  'SC.L2-3.13.16': '03.13.16',
  'SI.L2-3.14.1': '03.14.01', 'SI.L2-3.14.2': '03.14.02', 'SI.L2-3.14.3': '03.14.03',
  'SI.L2-3.14.4': '03.14.04', 'SI.L2-3.14.5': '03.14.05', 'SI.L2-3.14.6': '03.14.06',
  'SI.L2-3.14.7': '03.14.07',
}

/**
 * Normalize requirement ID to NIST format (03.xx.xx)
 * Accepts both NIST format (03.01.01) and CMMC format (AC.L2-3.1.1)
 */
function normalizeRequirementId(requirementId: string): string {
  // If it's already in NIST format (starts with 03.)
  if (requirementId.startsWith('03.')) {
    return requirementId
  }
  // Check if it's CMMC format and convert
  if (cmmcToNistMap[requirementId]) {
    return cmmcToNistMap[requirementId]
  }
  // Return as-is if unknown format
  return requirementId
}

/**
 * Get requirement value info, with safe fallback
 * Accepts both NIST format (03.01.01) and CMMC format (AC.L2-3.1.1)
 */
export function getRequirementValue(requirementId: string): CMMCRequirementValue {
  const normalizedId = normalizeRequirementId(requirementId)
  return cmmcRequirementValues[normalizedId] || {
    value: 1,
    displayValue: '1',
    poamAllowed: true
  }
}

/**
 * Get the point value for a requirement (numeric only)
 */
export function getRequirementPointValue(requirementId: string): number {
  const normalizedId = normalizeRequirementId(requirementId)
  return cmmcRequirementValues[normalizedId]?.value ?? 1
}

/**
 * Check if a requirement can be in a POA&M
 */
export function isPoamAllowed(requirementId: string): boolean {
  const normalizedId = normalizeRequirementId(requirementId)
  return cmmcRequirementValues[normalizedId]?.poamAllowed ?? true
}

/**
 * Get criticality level based on point value
 */
export function getRequirementCriticality(requirementId: string): 'critical' | 'important' | 'standard' {
  const value = getRequirementPointValue(requirementId)
  if (value >= 5) return 'critical'
  if (value >= 3) return 'important'
  return 'standard'
}

/**
 * Count requirements by point value
 */
export const requirementCountsByValue = {
  critical: Object.values(cmmcRequirementValues).filter(v => v.value === 5).length,
  important: Object.values(cmmcRequirementValues).filter(v => v.value === 3).length,
  standard: Object.values(cmmcRequirementValues).filter(v => v.value === 1).length,
  total: Object.keys(cmmcRequirementValues).length,
}

/**
 * Get all critical (5-point) requirements
 */
export function getCriticalRequirements(): string[] {
  return Object.entries(cmmcRequirementValues)
    .filter(([_, v]) => v.value === 5)
    .map(([id]) => id)
}

/**
 * Get all requirements that cannot be in a POA&M
 */
export function getNonPoamRequirements(): string[] {
  return Object.entries(cmmcRequirementValues)
    .filter(([_, v]) => !v.poamAllowed)
    .map(([id]) => id)
}
