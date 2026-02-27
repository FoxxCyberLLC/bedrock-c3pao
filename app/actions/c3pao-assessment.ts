'use server'

import { requireAuth } from '@/lib/auth'
import { saveAssessmentFinding as _save, getAssessmentFindings as _getFindings, updateAssessorNotes as _updateNotes } from './assessment'
import {
  fetchReport, fetchAssessmentReport as apiFetchAssessmentReport, fetchStats, fetchSPRS,
  saveAssessmentReport as apiSaveReport, updateReportStatus as apiUpdateReportStatus,
  fetchDailyProgress, fetchProgressByAssessor, fetchProgressByDomain,
  reviewFinding as apiReviewFinding, fetchPlanning, updatePlanning as apiUpdatePlanning,
  type DailyProgress, type AssessorProgress, type DomainProgress, type FindingView, type PlanningData,
} from '@/lib/api-client'

export async function saveAssessmentFinding(...args: Parameters<typeof _save>) {
  return _save(...args)
}

export async function getAssessmentFindings(...args: Parameters<typeof _getFindings>) {
  return _getFindings(...args)
}

export async function updateAssessorNotes(...args: Parameters<typeof _updateNotes>) {
  return _updateNotes(...args)
}

export async function getAssessmentStats(engagementId: string) {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, data: null, error: 'Unauthorized' }
    const token = session.apiToken
    const stats = await fetchStats(engagementId, token)
    const totals = stats.totals
    // Compute 'assessed' as total - notAssessed for component compatibility
    const assessed = totals.total - (totals.notAssessed || 0)
    return { success: true, data: { ...totals, assessed } }
  } catch (error) {
    return { success: false, data: null, error: error instanceof Error ? error.message : 'Failed to fetch assessment stats' }
  }
}

export async function calculateSPRSScore(engagementId: string) {
  try {
    const session = await requireAuth()
    if (!session) return { score: 0, maxScore: 110 }
    const token = session.apiToken
    const data = await fetchSPRS(engagementId, token)
    return { score: data.score, maxScore: data.maxScore }
  } catch {
    return { score: 0, maxScore: 110 }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveAssessmentReport(data: any): Promise<{ success: boolean; data?: { id: string } | null; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, data: null, error: 'Unauthorized' }
    const token = session.apiToken
    const result = await apiSaveReport(data.engagementId, {
      executiveSummary: data.executiveSummary || data.reportData,
      scopeDescription: data.scopeDescription,
      methodology: data.methodology,
      findingsSummary: data.findingsSummary,
      recommendations: data.recommendations,
      conclusion: data.conclusion,
    }, token)
    return { success: true, data: { id: result.id || data.engagementId } }
  } catch (error) {
    return { success: false, data: null, error: error instanceof Error ? error.message : 'Failed to save report' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAssessmentReport(engagementId: string): Promise<{ success: boolean; data?: any }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, data: null }
    const report = await apiFetchAssessmentReport(engagementId, session.apiToken)
    return { success: true, data: report }
  } catch {
    return { success: false, data: null }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateReportStatus(engagementId: string, status: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const token = session.apiToken
    await apiUpdateReportStatus(engagementId, status, token)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update report status' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateReportData(engagementId: string): Promise<{ success: boolean; data?: any }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, data: null }
    const report = await fetchReport(engagementId, session.apiToken)
    return { success: true, data: report }
  } catch {
    return { success: false, data: null }
  }
}

// ---- Progress Tracking ----

export async function getAssessmentProgress(engagementId: string): Promise<{ success: boolean; data?: DailyProgress; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await fetchDailyProgress(engagementId, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load progress' }
  }
}

export async function getProgressByAssessor(engagementId: string): Promise<{ success: boolean; data?: AssessorProgress[]; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await fetchProgressByAssessor(engagementId, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load assessor progress' }
  }
}

export async function getProgressByDomain(engagementId: string): Promise<{ success: boolean; data?: DomainProgress[]; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await fetchProgressByDomain(engagementId, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load domain progress' }
  }
}

// ---- Finding Review ----

export async function reviewAssessmentFinding(
  engagementId: string,
  findingId: string,
  status: string,
  notes?: string
): Promise<{ success: boolean; data?: FindingView; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await apiReviewFinding(engagementId, findingId, { status, notes }, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to review finding' }
  }
}

// ---- Planning ----

export async function getAssessmentPlanning(engagementId: string): Promise<{ success: boolean; data?: PlanningData; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await fetchPlanning(engagementId, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load planning data' }
  }
}

export async function updateAssessmentPlanning(
  engagementId: string,
  body: Partial<PlanningData>
): Promise<{ success: boolean; data?: PlanningData; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const data = await apiUpdatePlanning(engagementId, body, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update planning' }
  }
}
