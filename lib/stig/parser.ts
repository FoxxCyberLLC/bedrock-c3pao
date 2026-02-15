import { z } from 'zod';
import { STIGFindingStatus, STIGSeverity } from '@/lib/prisma-types';

// ============================================
// CKLB FILE ZOD SCHEMAS
// ============================================

export const CKLBRuleSchema = z.object({
  rule_title: z.string(),
  status: z.enum(['open', 'not_a_finding', 'not_applicable', 'not_reviewed']),
  severity: z.enum(['high', 'medium', 'low', 'critical']).transform((val) =>
    val === 'critical' ? 'high' : val // Map critical to high
  ),
  group_id: z.string(),
  rule_id_src: z.string(),
  rule_id: z.string().optional(),
  ccis: z.array(z.string()).optional().default([]),
  finding_details: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
  check_content: z.string().optional().nullable(),
  fix_text: z.string().optional().nullable(),
  discussion: z.string().optional().nullable(),
  weight: z.string().optional().nullable(),
  rule_version: z.string().optional().nullable(),
  group_id_src: z.string().optional().nullable(),
  group_title: z.string().optional().nullable(),
  legacy_ids: z.array(z.string()).optional(),
});

export const CKLBSTIGSchema = z.object({
  display_name: z.string(),
  stig_id: z.string().optional(),
  version: z.string().optional().default('1'),
  release_info: z.string().optional().nullable(),
  classification: z.string().optional().nullable(),
  uuid: z.string().optional(),
  size: z.number().optional(),
  rules: z.array(CKLBRuleSchema),
});

export const CKLBTargetDataSchema = z.object({
  fqdn: z.string().optional().nullable(),
  target_type: z.string().optional().nullable(),
  ip_address: z.string().optional().nullable(),
  host_name: z.string(),
  role: z.string().optional().nullable(),
  mac_address: z.string().optional().nullable(),
});

export const CKLBFileSchema = z.object({
  title: z.string().optional().nullable(),
  id: z.string().optional().nullable(),
  cklb_version: z.string().optional().nullable(),
  target_data: CKLBTargetDataSchema,
  stigs: z.array(CKLBSTIGSchema),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type CKLBFile = z.infer<typeof CKLBFileSchema>;
export type CKLBSTIG = z.infer<typeof CKLBSTIGSchema>;
export type CKLBRule = z.infer<typeof CKLBRuleSchema>;
export type CKLBTargetData = z.infer<typeof CKLBTargetDataSchema>;

// ============================================
// PARSER FUNCTIONS
// ============================================

/**
 * Parse a CKLB JSON file content
 */
export function parseCKLBFile(jsonContent: string): CKLBFile {
  const parsed = JSON.parse(jsonContent);
  return CKLBFileSchema.parse(parsed);
}

/**
 * Map CKLB status string to Prisma enum
 */
export function mapStatus(status: string): STIGFindingStatus {
  const mapping: Record<string, STIGFindingStatus> = {
    'open': 'OPEN',
    'not_a_finding': 'NOT_A_FINDING',
    'not_applicable': 'NOT_APPLICABLE',
    'not_reviewed': 'NOT_REVIEWED',
  };
  return mapping[status] || 'NOT_REVIEWED';
}

/**
 * Map CKLB severity string to Prisma enum
 */
export function mapSeverity(severity: string): STIGSeverity {
  const mapping: Record<string, STIGSeverity> = {
    'high': 'HIGH',
    'critical': 'HIGH', // Map critical to high
    'medium': 'MEDIUM',
    'low': 'LOW',
  };
  return mapping[severity] || 'MEDIUM';
}

/**
 * Calculate status counts from rules
 */
export function calculateStatusCounts(rules: CKLBRule[]): {
  totalRules: number;
  openCount: number;
  notAFindingCount: number;
  notApplicableCount: number;
  notReviewedCount: number;
} {
  const counts = {
    totalRules: rules.length,
    openCount: 0,
    notAFindingCount: 0,
    notApplicableCount: 0,
    notReviewedCount: 0,
  };

  for (const rule of rules) {
    switch (rule.status) {
      case 'open':
        counts.openCount++;
        break;
      case 'not_a_finding':
        counts.notAFindingCount++;
        break;
      case 'not_applicable':
        counts.notApplicableCount++;
        break;
      case 'not_reviewed':
        counts.notReviewedCount++;
        break;
    }
  }

  return counts;
}

/**
 * Validate that a file is a valid CKLB file
 */
export function validateCKLBFile(jsonContent: string): {
  valid: boolean;
  error?: string;
  data?: CKLBFile;
} {
  try {
    const data = parseCKLBFile(jsonContent);

    if (!data.target_data?.host_name) {
      return { valid: false, error: 'Missing target host_name in CKLB file' };
    }

    if (!data.stigs || data.stigs.length === 0) {
      return { valid: false, error: 'No STIGs found in CKLB file' };
    }

    return { valid: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        error: `Invalid CKLB format: ${error.issues.map((issue) => issue.message).join(', ')}`
      };
    }
    if (error instanceof SyntaxError) {
      return { valid: false, error: 'Invalid JSON format' };
    }
    return { valid: false, error: 'Failed to parse CKLB file' };
  }
}
