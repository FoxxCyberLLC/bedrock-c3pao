'use server'

import { requireAuth } from '@/lib/auth'
import {
  fetchEngagementDetail,
  fetchEngagementPhase,
} from '@/lib/api-client'
import { buildCertificateData } from '@/lib/certificates/build-cert-data'
import type { CertificateData } from '@/lib/pdf-templates/cmmc-certificate'

interface CertResult {
  success: boolean
  data?: CertificateData
  error?: string
}

/** Resolve the CertificateData payload for an engagement, or return an error. */
export async function getCertificateDataForEngagement(
  engagementId: string,
): Promise<CertResult> {
  const session = await requireAuth()
  if (!session) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!engagementId) {
    return { success: false, error: 'Missing engagement id' }
  }

  try {
    const [detailRaw, phase] = await Promise.all([
      fetchEngagementDetail(engagementId, session.apiToken),
      fetchEngagementPhase(engagementId, session.apiToken).catch(() => null),
    ])

    const detail = detailRaw as Record<string, unknown>

    const organizationName =
      (detail.organizationName as string | undefined) ??
      (detail.packageName as string | undefined) ??
      'Unknown Organization'
    const packageName =
      (detail.packageName as string | undefined) ?? 'Unknown Package'
    const targetLevel = (detail.targetLevel as string | undefined) ?? ''
    const assessmentResult =
      (detail.assessmentResult as string | null | undefined) ?? null
    const actualCompletionDate =
      (detail.actualCompletionDate as string | null | undefined) ?? null
    const leadAssessorName =
      (detail.leadAssessorName as string | null | undefined) ?? null
    const c3paoName =
      session.c3paoUser.c3paoName ?? 'Certified Third-Party Assessment Organization'

    const data = buildCertificateData({
      engagementId,
      organizationName,
      packageName,
      targetLevel,
      assessmentResult,
      actualCompletionDate,
      leadAssessorName,
      c3paoName,
      poamCloseoutDate: phase?.poamCloseoutDue ?? null,
    })

    if (!data) {
      return {
        success: false,
        error: 'No certificate available for this engagement',
      }
    }

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to load certificate data',
    }
  }
}
