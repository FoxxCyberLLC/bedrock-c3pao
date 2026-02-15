'use server'

import { requireAuth } from '@/lib/auth'
import { fetchEMassExport } from '@/lib/api-client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EMASSWizardData = any

export async function getEMASSExportData(engagementId: string) {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const data = await fetchEMassExport(engagementId, session.apiToken)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load eMASS export data' }
  }
}

export async function exportToEMASS() {
  return { success: false, error: 'eMASS export download not yet available' }
}
