'use server'

import { getWorkloadData as _getWorkload } from './team'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getC3PAOWorkloadOverview(): Promise<{ success: boolean; data?: any; error?: string }> {
  const result = await _getWorkload()
  if (!result.success || !result.data) return result
  // API returns flat AssessorWorkloadItem[] — map to shape the component expects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawItems = Array.isArray(result.data) ? result.data : (result.data as any)?.assessors || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assessors = rawItems.map((a: any) => ({
    id: a.assessorId || a.id,
    name: a.assessorName || a.name,
    email: a.assessorEmail || a.email,
    jobTitle: a.jobTitle || null,
    isLeadAssessor: a.assessorType === 'CCA' || a.isLeadAssessor || false,
    ccaNumber: a.ccaNumber || null,
    ccpNumber: a.ccpNumber || null,
    activeEngagements: a.activeEngagements || 0,
    pendingEngagements: 0,
    completedEngagements: 0,
    totalAssigned: a.activeEngagements || 0,
  }))
  const totalAssessors = assessors.length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalActiveEngagements = assessors.reduce((sum: number, a: any) => sum + (a.activeEngagements || 0), 0)
  return {
    success: true,
    data: {
      assessors,
      engagementsByStatus: {} as Record<string, number>,
      totalAssessors,
      totalActiveEngagements,
      totalEngagements: totalActiveEngagements,
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAssessorWorkload(assessorId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  // Individual assessor workload detail — get full workload and filter
  const result = await _getWorkload()
  if (!result.success || !result.data) return result
  // API returns flat AssessorWorkloadItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawItems = Array.isArray(result.data) ? result.data : (result.data as any)?.assessors || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assessor = rawItems.find((a: any) => (a.assessorId || a.id) === assessorId) || null
  if (!assessor) return { success: true, data: null }
  // Build AssessorDetail shape the component expects
  return {
    success: true,
    data: {
      assessor: {
        id: assessor.assessorId || assessor.id,
        name: assessor.assessorName || assessor.name,
        email: assessor.assessorEmail || assessor.email,
        jobTitle: assessor.jobTitle || null,
        isLeadAssessor: assessor.assessorType === 'CCA' || assessor.isLeadAssessor || false,
        ccaNumber: assessor.ccaNumber || null,
        ccpNumber: assessor.ccpNumber || null,
      },
      engagements: [],
      stats: {
        active: assessor.activeEngagements || 0,
        pending: 0,
        completed: 0,
        total: assessor.activeEngagements || 0,
      },
    },
  }
}
