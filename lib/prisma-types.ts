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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
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
  name: string
  assetName?: string
  assetType: string
  assetCategory?: string
  hostname?: string | null
  ipAddress?: string | null
  description?: string | null
  stigTargetId?: string | null
  stigTarget?: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export interface STIGRule {
  id: string
  ruleId: string
  ruleTitle: string
  title: string
  description: string
  severity: string
  status: string
  groupId: string
  groupTitle?: string
  fixText?: string | null
  checkContent?: string | null
  comments?: string | null
  finding?: string | null
  checklistId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export type STIGFindingStatus = 'OPEN' | 'NOT_A_FINDING' | 'NOT_APPLICABLE' | 'NOT_REVIEWED' | string
export type STIGSeverity = 'CAT_I' | 'CAT_II' | 'CAT_III' | 'HIGH' | 'MEDIUM' | 'LOW' | string
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'
export type POAMStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'OVERDUE'

export interface SSP {
  id: string
  version: string
  status: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export interface POAMWithMilestones {
  id: string
  weakness: string
  riskLevel: string
  status: string
  milestones: unknown[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

// Stub for Prisma namespace used in some type utilities
export namespace Prisma {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type POAMGetPayload<T = any> = any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type POAMMilestoneGetPayload<T = any> = any
}
