'use server'

import { requireAuth } from '@/lib/auth'
import { saveAssessmentFinding as _save, getAssessmentFindings as _getFindings, updateAssessorNotes as _updateNotes } from './assessment'
import { fetchReport, fetchAssessmentReport as apiFetchAssessmentReport, fetchStats, fetchSPRS, saveAssessmentReport as apiSaveReport, updateReportStatus as apiUpdateReportStatus } from '@/lib/api-client'

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
