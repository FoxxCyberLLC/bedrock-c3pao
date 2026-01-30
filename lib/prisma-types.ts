/**
 * Stub types replacing Prisma-generated types from the SaaS platform.
 * These provide type compatibility for components copied from bedrock-cmmc.
 */

export interface Evidence {
  id: string
  fileName: string
  fileType: string
  mimeType: string | null
  fileSize: number
  description: string | null
  uploadedAt: string | Date
  uploadedBy: string | null
  atoPackageId: string | null
  engagementId: string | null
  controlId: string | null
  downloadUrl?: string
  status?: string
  expirationDate: Date | null
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface RequirementFamily {
  id: string
  code: string
  name: string
  description?: string | null
}

export interface Requirement {
  id: string
  identifier: string
  requirementId?: string
  title: string
  description: string | null
  familyId: string
  family?: RequirementFamily
  [key: string]: unknown
}

export interface RequirementStatus {
  id: string
  requirementId: string
  atoPackageId: string | null
  status: string
  notes: string | null
  requirement?: Requirement
  evidenceId?: string | null
}

export type EngagementAssessorRole = 'LEAD_ASSESSOR' | 'ASSESSOR' | 'OBSERVER'

export interface Asset {
  id: string
  assetName: string
  assetType: string
  assetCategory?: string
  description?: string | null
  [key: string]: unknown
}

export interface STIGRule {
  id: string
  ruleId: string
  title: string
  description: string
  severity: string
  status: string
  checklistId?: string
  [key: string]: unknown
}

export type STIGFindingStatus = 'OPEN' | 'NOT_A_FINDING' | 'NOT_APPLICABLE' | 'NOT_REVIEWED'
export type STIGSeverity = 'CAT_I' | 'CAT_II' | 'CAT_III'
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'
export type POAMStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'OVERDUE'

export interface SSP {
  id: string
  version: string
  status: string
  [key: string]: unknown
}

export interface POAMWithMilestones {
  id: string
  weakness: string
  riskLevel: string
  status: string
  milestones: unknown[]
  [key: string]: unknown
}

// Stub for Prisma namespace used in some type utilities
export namespace Prisma {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type POAMGetPayload<T = any> = any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type POAMMilestoneGetPayload<T = any> = any
}
