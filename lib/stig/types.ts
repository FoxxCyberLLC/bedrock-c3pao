// Standalone replacements for Prisma STIG types

// ============================================
// BASE TYPES (replacing @prisma/client)
// ============================================

export type AssetType = 'HARDWARE' | 'SOFTWARE' | 'NETWORK' | 'OTHER' | string;

export interface STIGImport {
  id: string;
  fileName: string;
  importedAt: Date | string;
  importedById?: string;
  packageId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface STIGTarget {
  id: string;
  hostname: string;
  fqdn?: string | null;
  ipAddress?: string | null;
  mac?: string | null;
  assetType?: string;
  role?: string;
  technologyArea?: string;
  importId: string;
  packageId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface STIGChecklist {
  id: string;
  stigId: string;
  displayName: string;
  version?: string;
  releaseInfo?: string;
  targetId: string;
  importId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface STIGRule {
  id: string;
  ruleId: string;
  ruleTitle: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  groupId: string;
  checklistId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export type STIGFindingStatus = 'OPEN' | 'NOT_A_FINDING' | 'NOT_APPLICABLE' | 'NOT_REVIEWED' | string;
export type STIGSeverity = 'CAT_I' | 'CAT_II' | 'CAT_III' | 'HIGH' | 'MEDIUM' | 'LOW' | string;

// ============================================
// EXTENDED TYPES WITH RELATIONS
// ============================================

// Linked asset summary for STIG targets
export interface LinkedAssetSummary {
  id: string;
  name: string;
  assetType: AssetType;
  hostname: string | null;
  ipAddress: string | null;
}

export type STIGTargetWithStats = STIGTarget & {
  checklists: STIGChecklistWithCounts[];
  asset?: LinkedAssetSummary | null;
  _count?: {
    checklists: number;
  };
  // Aggregated stats across all checklists
  totalRules: number;
  openCount: number;
  notAFindingCount: number;
  notApplicableCount: number;
  notReviewedCount: number;
  compliancePercentage: number;
};

export type STIGChecklistWithCounts = STIGChecklist & {
  compliancePercentage: number;
};

export type STIGChecklistWithRules = STIGChecklist & {
  rules: STIGRule[];
  target: STIGTarget;
};

export type STIGImportWithDetails = STIGImport & {
  checklists: (STIGChecklist & {
    target: STIGTarget;
    _count: {
      rules: number;
    };
  })[];
};

// ============================================
// FILTER TYPES
// ============================================

export interface STIGRuleFilters {
  status?: STIGFindingStatus;
  severity?: STIGSeverity;
  search?: string;
}

// ============================================
// STATISTICS TYPES
// ============================================

export interface STIGStatistics {
  totalTargets: number;
  totalChecklists: number;
  totalRules: number;
  byStatus: {
    OPEN: number;
    NOT_A_FINDING: number;
    NOT_APPLICABLE: number;
    NOT_REVIEWED: number;
  };
  bySeverity: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  compliancePercentage: number;
  recentImports: STIGImport[];
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface STIGImportResult {
  importId: string;
  targetsImported: number;
  stigsImported: number;
  rulesImported: number;
  targetHostname: string;
}
