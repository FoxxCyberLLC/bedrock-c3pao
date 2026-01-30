'use server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EMASSWizardData = any

export async function exportToEMASS(data: EMASSWizardData) {
  return { success: false, error: 'eMASS export not yet implemented in standalone' }
}
