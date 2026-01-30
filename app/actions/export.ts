'use server'

import { requireAuth } from '@/lib/auth'
import { getFindings, getReport, upsertReport, enqueueSync, logAudit } from '@/lib/db'

export async function getAssessmentReportData(engagementId: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const findings = getFindings(engagementId)
    const report = getReport(engagementId)

    return {
      success: true,
      data: {
        findings,
        report: report ? JSON.parse(report.report_data || '{}') : null,
        reportStatus: report?.status || 'DRAFT',
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

    const existingReport = getReport(input.engagementId)
    const id = existingReport?.id || crypto.randomUUID()

    upsertReport({
      id,
      engagement_id: input.engagementId,
      report_data: input.reportData,
      status: input.status,
    })

    enqueueSync({
      entity_type: 'report',
      entity_id: id,
      engagement_id: input.engagementId,
      action: existingReport ? 'update' : 'create',
      payload: JSON.stringify({
        id,
        data: input.reportData,
        status: input.status,
        engagementId: input.engagementId,
      }),
    })

    logAudit({
      assessor_id: session.c3paoUser.id,
      assessor_email: session.c3paoUser.email,
      action: 'REPORT_SAVED',
      resource: 'AssessmentReport',
      resource_id: id,
      details: JSON.stringify({ status: input.status }),
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save report' }
  }
}
