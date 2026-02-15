'use server'

import { getWorkloadData as _getWorkload } from './team'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getC3PAOWorkloadOverview(): Promise<{ success: boolean; data?: any; error?: string }> {
  const result = await _getWorkload()
  if (!result.success || !result.data) return result
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = result.data as any
  // Enrich with fields the WorkloadOverview component expects
  const assessors = raw.assessors || []
  const totalAssessors = assessors.length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalActiveEngagements = assessors.reduce((sum: number, a: any) => sum + (a.activeEngagements || 0), 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalEngagements = assessors.reduce((sum: number, a: any) => sum + (a.activeEngagements || 0) + (a.completedEngagements || 0) + (a.pendingEngagements || 0), 0)
  return {
    success: true,
    data: {
      ...raw,
      assessors,
      totalAssessors,
      totalActiveEngagements,
      totalEngagements,
      engagementsByStatus: raw.engagementsByStatus || {},
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAssessorWorkload(assessorId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  // Individual assessor workload detail — get full workload and filter
  const result = await _getWorkload()
  if (!result.success || !result.data) return result
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assessors = (result.data as any)?.assessors || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assessor = assessors.find((a: any) => a.id === assessorId) || null
  if (!assessor) return { success: true, data: null }
  // Build AssessorDetail shape the component expects
  return {
    success: true,
    data: {
      assessor: {
        id: assessor.id,
        name: assessor.name,
        email: assessor.email,
        jobTitle: assessor.jobTitle || null,
        isLeadAssessor: assessor.isLeadAssessor || false,
        ccaNumber: assessor.ccaNumber || null,
        ccpNumber: assessor.ccpNumber || null,
      },
      engagements: assessor.engagements || [],
      stats: {
        active: assessor.activeEngagements || 0,
        pending: assessor.pendingEngagements || 0,
        completed: assessor.completedEngagements || 0,
        total: (assessor.activeEngagements || 0) + (assessor.pendingEngagements || 0) + (assessor.completedEngagements || 0),
      },
    },
  }
}
