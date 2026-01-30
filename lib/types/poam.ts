// POAM Types and Enums
// Based on CMMC POA&M requirements

// Prisma types replaced - data comes from SaaS API as JSON;

// Re-export Prisma enums
export { POAMType, RiskLevel, POAMStatus } from '@prisma/client';

// Full POAM with all relations
export type POAMWithRelations = Prisma.POAMGetPayload<{
  include: {
    requirement: {
      include: {
        family: true;
      };
    };
    requirements: {
      include: {
        requirement: {
          include: {
            family: true;
          };
        };
      };
    };
    atoPackage: true;
    milestones: true;
  };
}>;

// POAM with just milestones
export type POAMWithMilestones = Prisma.POAMGetPayload<{
  include: {
    milestones: true;
  };
}>;

// Milestone type
export type POAMMilestone = Prisma.POAMMilestoneGetPayload<Record<string, never>>;

// Form input types
export interface CreatePOAMInput {
  type: 'ASSESSMENT' | 'OPERATIONAL';
  requirementIds: string[];  // Changed from requirementId to support multiple
  atoPackageId: string;
  title: string;
  description: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  remediationPlan: string;
  scheduledCompletionDate: Date;
  createdBy?: string;  // Made optional for compatibility
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
