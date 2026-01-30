'use server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StubResult = { success: boolean; error?: string; data?: any; message?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function closePOAM(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'POAM management not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createPOAM(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'POAM management not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updatePOAM(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'POAM management not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deletePOAM(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'POAM management not available in standalone mode' }
}
