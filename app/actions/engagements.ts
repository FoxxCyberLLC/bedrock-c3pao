'use server'

import { requireAuth } from '@/lib/auth'
import {
  fetchAssessments,
  fetchControls,
  fetchEvidence,
  fetchPOAMs,
  fetchSSP,
  fetchTeam,
  fetchSTIGs,
  type EngagementSummary,
  type ControlView,
  type EvidenceView,
  type POAMView,
  type SSPView,
} from '@/lib/api-client'

async function getToken(): Promise<string> {
  const session = await requireAuth()
  if (!session) throw new Error('Unauthorized')
  return session.apiToken
}

export async function getC3PAOEngagements(): Promise<{ success: boolean; data?: EngagementSummary[]; error?: string }> {
  try {
    const token = await getToken()
    const engagements = await fetchAssessments(token)
    return { success: true, data: engagements }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load engagements' }
  }
}

export async function getEngagementById(id: string): Promise<{ success: boolean; data?: EngagementSummary; accessLevel?: string; error?: string }> {
  try {
    const token = await getToken()
    const engagements = await fetchAssessments(token)
    const engagement = engagements.find(e => e.id === id)

    if (!engagement) {
      return { success: false, error: 'Engagement not found' }
    }

    return {
      success: true,
      data: engagement,
      accessLevel: engagement.accessLevel,
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load engagement' }
  }
}

export async function getEngagementControls(engagementId: string): Promise<{ success: boolean; data?: ControlView[]; error?: string }> {
  try {
    const token = await getToken()
    const controls = await fetchControls(engagementId, token)
    return { success: true, data: controls }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load controls' }
  }
}

export async function getEngagementEvidence(engagementId: string): Promise<{ success: boolean; data?: EvidenceView[]; error?: string }> {
  try {
    const token = await getToken()
    const evidence = await fetchEvidence(engagementId, token)
    return { success: true, data: evidence }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load evidence' }
  }
}

export async function getEngagementPoams(engagementId: string): Promise<{ success: boolean; data?: POAMView[]; error?: string }> {
  try {
    const token = await getToken()
    const poams = await fetchPOAMs(engagementId, token)
    return { success: true, data: poams }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load POA&Ms' }
  }
}

export async function getEngagementSSP(engagementId: string): Promise<{ success: boolean; data?: SSPView; error?: string }> {
  try {
    const token = await getToken()
    const ssp = await fetchSSP(engagementId, token)
    return { success: true, data: ssp }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load SSP' }
  }
}

export async function getC3PAOTeam(): Promise<{ success: boolean; data?: unknown[]; error?: string }> {
  try {
    const token = await getToken()
    // Fetch team from first available engagement, or return empty
    const engagements = await fetchAssessments(token)
    if (engagements.length === 0) return { success: true, data: [] }
    const team = await fetchTeam(engagements[0].id, token)
    return { success: true, data: team }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load team' }
  }
}

export async function getCurrentC3PAOUser(): Promise<{ success: boolean; data?: { id: string; isLeadAssessor: boolean }; error?: string }> {
  try {
    const session = await requireAuth()
    if (!session) return { success: false, error: 'Unauthorized' }

    return {
      success: true,
      data: {
        id: session.c3paoUser.id,
        isLeadAssessor: session.c3paoUser.isLeadAssessor,
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get user' }
  }
}

export async function getEngagementTeam(engagementId: string): Promise<{ success: boolean; data?: unknown[]; error?: string }> {
  try {
    const token = await getToken()
    const team = await fetchTeam(engagementId, token)
    return { success: true, data: team }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load team' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEngagementStigs(engagementId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const token = await getToken()
    const stigs = await fetchSTIGs(engagementId, token)
    return { success: true, data: stigs }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load STIGs' }
  }
}

// Control detail for individual assessment page
export async function getEngagementControlDetail(engagementId: string, controlId: string): Promise<{
  success: boolean
  data?: {
    engagement: EngagementSummary
    control: ControlView
    navigation: { prevId: string | null; prevName: string | null; nextId: string | null; nextName: string | null; currentIndex: number; total: number }
  }
  error?: string
}> {
  try {
    const token = await getToken()
    const [engagements, controls] = await Promise.all([
      fetchAssessments(token),
      fetchControls(engagementId, token),
    ])

    const engagement = engagements.find(e => e.id === engagementId)
    if (!engagement) {
      return { success: false, error: 'Engagement not found' }
    }

    const controlIndex = controls.findIndex(c => c.id === controlId)
    if (controlIndex === -1) {
      return { success: false, error: 'Control not found' }
    }

    const control = controls[controlIndex]
    const prev = controlIndex > 0 ? controls[controlIndex - 1] : null
    const next = controlIndex < controls.length - 1 ? controls[controlIndex + 1] : null

    return {
      success: true,
      data: {
        engagement,
        control,
        navigation: {
          prevId: prev?.id || null,
          prevName: prev?.requirementId || null,
          nextId: next?.id || null,
          nextName: next?.requirementId || null,
          currentIndex: controlIndex + 1,
          total: controls.length,
        },
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load control detail' }
  }
}
