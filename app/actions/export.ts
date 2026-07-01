'use server'

import { requireAuth } from '@/lib/auth'
import { isOffline } from '@/lib/mode'
import { getLocalReport, saveLocalAssessmentReport } from '@/lib/local/reports'
import { fetchReport, saveAssessmentReport as apiSaveReport } from '@/lib/api-client'

export async function getAssessmentReportData(engagementId: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const report = isOffline() ? await getLocalReport(engagementId) : await fetchReport(engagementId, session.apiToken)

    return {
      success: true,
      data: {
        findings: report.findings,
        report: report,
        reportStatus: 'DRAFT',
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load report data' }
  }
}

export async function saveAssessmentReport(input: {
  engagementId: string
  reportData: string
  status: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }
    const body = { executiveSummary: input.reportData, status: input.status }
    if (isOffline()) {
      await saveLocalAssessmentReport(input.engagementId, body)
    } else {
      await apiSaveReport(input.engagementId, body, session.apiToken)
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save report' }
  }
}
