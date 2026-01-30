'use server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StubResult = { success: boolean; error?: string; data?: any; message?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deleteEvidence(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Evidence management not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function uploadEvidence(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Evidence upload not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEvidenceDownloadUrl(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Evidence download not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEvidenceByPackage(...args: any[]): Promise<StubResult> {
  return { success: true, data: [] }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function linkEvidenceToRequirement(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Evidence linking not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function unlinkEvidenceFromRequirement(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Evidence unlinking not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getRequirementStatusesByPackage(...args: any[]): Promise<StubResult> {
  return { success: true, data: [] }
}
