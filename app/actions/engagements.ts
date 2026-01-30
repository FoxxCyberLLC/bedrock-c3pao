'use server'

import { requireAuth } from '@/lib/auth'
import { getEngagements, getEngagement, getControls, getEvidence, getPoams, getStigs, getTeam } from '@/lib/cache'
import type { EngagementSummary, EngagementDetail, ControlForAssessment, EvidenceItem, PoamItem, StigItem, TeamMember } from '@/lib/api-client'

async function getToken(): Promise<string> {
  const session = await requireAuth()
  if (!session) throw new Error('Unauthorized')
  return session.saasToken
}

export async function getC3PAOEngagements(): Promise<{ success: boolean; data?: EngagementSummary[]; error?: string }> {
  try {
    const token = await getToken()
    const engagements = await getEngagements(token)
    return { success: true, data: engagements }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load engagements' }
  }
}

export async function getEngagementById(id: string): Promise<{ success: boolean; data?: EngagementDetail; accessLevel?: string; error?: string }> {
  try {
    const token = await getToken()
    const engagement = await getEngagement(id, token)

    return {
      success: true,
      data: engagement,
      accessLevel: engagement.accessLevel,
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load engagement' }
  }
}

export async function getEngagementControls(engagementId: string): Promise<{ success: boolean; data?: ControlForAssessment[]; error?: string }> {
  try {
    const token = await getToken()
    const controls = await getControls(engagementId, token)
    return { success: true, data: controls }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load controls' }
  }
}

export async function getEngagementEvidence(engagementId: string): Promise<{ success: boolean; data?: EvidenceItem[]; error?: string }> {
  try {
    const token = await getToken()
    const evidence = await getEvidence(engagementId, token)
    return { success: true, data: evidence }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load evidence' }
  }
}

export async function getEngagementPoams(engagementId: string): Promise<{ success: boolean; data?: PoamItem[]; error?: string }> {
  try {
    const token = await getToken()
    const poams = await getPoams(engagementId, token)
    return { success: true, data: poams }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load POA&Ms' }
  }
}

export async function getEngagementStigs(engagementId: string): Promise<{ success: boolean; data?: StigItem[]; error?: string }> {
  try {
    const token = await getToken()
    const stigs = await getStigs(engagementId, token)
    return { success: true, data: stigs }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load STIGs' }
  }
}

export async function getC3PAOTeam(): Promise<{ success: boolean; data?: TeamMember[]; error?: string }> {
  // Team data is engagement-scoped in standalone; return empty for dashboard
  return { success: true, data: [] }
}

export async function getEngagementTeam(engagementId: string): Promise<{ success: boolean; data?: TeamMember[]; error?: string }> {
  try {
    const token = await getToken()
    const team = await getTeam(engagementId, token)
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

// Control detail for individual assessment page
export async function getEngagementControlDetail(engagementId: string, controlId: string): Promise<{
  success: boolean
  data?: {
    engagement: EngagementDetail
    control: ControlForAssessment
    navigation: { prevId: string | null; prevName: string | null; nextId: string | null; nextName: string | null; currentIndex: number; total: number }
  }
  error?: string
}> {
  try {
    const token = await getToken()
    const [engagement, controls] = await Promise.all([
      getEngagement(engagementId, token),
      getControls(engagementId, token),
    ])

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
          prevName: prev?.controlIdentifier || null,
          nextId: next?.id || null,
          nextName: next?.controlIdentifier || null,
          currentIndex: controlIndex + 1,
          total: controls.length,
        },
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load control detail' }
  }
}
