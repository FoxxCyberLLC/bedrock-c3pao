// POAM Types and Enums
// Based on CMMC POA&M requirements

// Standalone replacements for Prisma enums
export type POAMType = 'ASSESSMENT' | 'OPERATIONAL';
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
export type POAMStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'OVERDUE';

// Full POAM with all relations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type POAMWithRelations = any;

// POAM with just milestones
export interface POAMWithMilestones {
  id: string;
  weakness?: string;
  riskLevel: string;
  status: string;
  remediationPlan?: string;
  scheduledCompletionDate?: Date | string | null;
  milestones: POAMMilestone[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Milestone type
export interface POAMMilestone {
  id: string;
  poamId: string;
  description: string;
  dueDate: Date | string;
  completed: boolean;
  completedDate?: Date | string | null;
  sortOrder?: number;
  [key: string]: unknown;
}

// Form input types
export interface CreatePOAMInput {
  type: 'ASSESSMENT' | 'OPERATIONAL';
  requirementIds: string[];
  atoPackageId: string;
  title: string;
  description: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  remediationPlan: string;
  scheduledCompletionDate: Date;
  createdBy?: string;
}

export interface UpdatePOAMInput {
  id: string;
  title?: string;
  description?: string;
  riskLevel?: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  status?: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'OVERDUE';
  remediationPlan?: string;
  scheduledCompletionDate?: Date;
  actualCompletionDate?: Date | null;
  reviewNotes?: string;
  lastReviewDate?: Date;
  updatedBy: string;
}

export interface CreateMilestoneInput {
  poamId: string;
  description: string;
  dueDate: Date;
  sortOrder?: number;
}

export interface UpdateMilestoneInput {
  id: string;
  description?: string;
  dueDate?: Date;
  completed?: boolean;
  completedDate?: Date | null;
  sortOrder?: number;
}

// Validation result types
export interface POAMValidationError {
  field: string;
  message: string;
}

export interface POAMValidationResult {
  valid: boolean;
  errors: POAMValidationError[];
}

// Dashboard statistics
export interface POAMStatistics {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
  overdue: number;
  byCriticality: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  byType: {
    assessment: number;
    operational: number;
  };
}

// Monthly report for continuous monitoring
export interface MonthlyPOAMReport {
  month: Date;
  totalOpen: number;
  newPOAMs: number;
  closedPOAMs: number;
  overduePOAMs: number;
  byRiskLevel: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
}
