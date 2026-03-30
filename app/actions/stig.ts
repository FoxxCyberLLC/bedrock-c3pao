'use server'

import { requireAuth } from '@/lib/auth'
import { fetchSTIGs } from '@/lib/api-client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSTIGTargets(engagementId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' } // H14: don't mask auth failure
    const stigs = await fetchSTIGs(engagementId, session.apiToken)
    return { success: true, data: stigs.targets || [] }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load STIGs' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSTIGStatistics(engagementId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' } // H14: don't mask auth failure
    const stigs = await fetchSTIGs(engagementId, session.apiToken)
    // Ensure the returned data conforms to STIGStatistics shape
    const statistics = stigs.statistics || {}
    const defaultStats = {
      totalTargets: 0,
      totalChecklists: 0,
      totalRules: 0,
      byStatus: { OPEN: 0, NOT_A_FINDING: 0, NOT_APPLICABLE: 0, NOT_REVIEWED: 0 },
      bySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
      compliancePercentage: 0,
      recentImports: [],
    }
    return { success: true, data: { ...defaultStats, ...statistics } }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load STIG statistics' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSTIGRules(checklistId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  // Individual checklist rules not exposed via C3PAO API endpoint — would need OSC STIG endpoint
  return { success: true, data: [] }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSTIGRulesByTarget(targetId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  return { success: true, data: [] }
}

// These are OSC write operations — not available from C3PAO
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function importCKLBFile(...args: unknown[]): Promise<{ success: boolean; error?: string; data?: any }> {
  return { success: false, error: 'STIG import is only available from the OSC interface' }
}

export async function linkSTIGTargetToAsset(...args: unknown[]) {
  return { success: false, error: 'Not available from C3PAO interface' }
}

export async function deleteSTIGTarget(targetId: string) {
  return { success: false, error: 'Not available from C3PAO interface' }
}

export async function deleteSTIGImport(importId: string) {
  return { success: false, error: 'Not available from C3PAO interface' }
}

export async function deleteSTIGChecklist(checklistId: string) {
  return { success: false, error: 'Not available from C3PAO interface' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createAssetFromSTIGTarget(targetId: string, ...args: unknown[]): Promise<{ success: boolean; error?: string; data?: any }> {
  return { success: false, error: 'Not available from C3PAO interface' }
}
