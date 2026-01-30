import type {
  STIGImport,
  STIGTarget,
  STIGChecklist,
  STIGRule,
  STIGFindingStatus,
  STIGSeverity,
  AssetType,
} from '@prisma/client';

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

// Re-export Prisma types for convenience
export type {
  STIGImport,
  STIGTarget,
  STIGChecklist,
  STIGRule,
  STIGFindingStatus,
  STIGSeverity,
};
