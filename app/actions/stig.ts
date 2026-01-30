'use server'

import { getEngagementStigs as _getStigs } from './engagements'

export async function getSTIGTargets(engagementId: string) {
  return _getStigs(engagementId)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSTIGStatistics(engagementId: string): Promise<{ success: boolean; data?: any }> {
  return { success: true, data: { totalTargets: 0, totalChecklists: 0, totalRules: 0, byStatus: { OPEN: 0, NOT_A_FINDING: 0, NOT_APPLICABLE: 0, NOT_REVIEWED: 0 }, bySeverity: { CAT_I: 0, CAT_II: 0, CAT_III: 0 }, compliancePercentage: 0, recentImports: [] } }
}

export async function getSTIGRules(checklistId: string) {
  return { success: true, data: [] }
}

export async function getSTIGRulesByTarget(targetId: string) {
  return { success: true, data: [] }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function importCKLBFile(...args: any[]) {
  return { success: false, error: 'STIG import not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function linkSTIGTargetToAsset(...args: any[]) {
  return { success: false, error: 'Not available in standalone mode' }
}

export async function deleteSTIGTarget(targetId: string) {
  return { success: false, error: 'Not available in standalone mode' }
}

export async function deleteSTIGImport(importId: string) {
  return { success: false, error: 'Not available in standalone mode' }
}

export async function deleteSTIGChecklist(checklistId: string) {
  return { success: false, error: 'Not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createAssetFromSTIGTarget(targetId: string, ...args: any[]): Promise<{ success: boolean; error?: string; data?: any }> {
  return { success: false, error: 'Not available in standalone mode' }
}
