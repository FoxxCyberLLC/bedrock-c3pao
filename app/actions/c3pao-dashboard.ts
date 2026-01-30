'use server'

import {
  getC3PAOEngagements as _getEngagements,
  getEngagementById as _getById,
  getC3PAOTeam as _getTeam,
  getCurrentC3PAOUser as _getCurrentUser,
} from './engagements'
import { updateAssessorNotes as _updateNotes } from './assessment'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StubResult = { success: boolean; error?: string; message?: string; data?: any }

export async function getC3PAOEngagements() {
  return _getEngagements()
}

export async function getEngagementById(id: string) {
  return _getById(id)
}

export async function getC3PAOTeam() {
  return _getTeam()
}

export async function getCurrentC3PAOUser() {
  return _getCurrentUser()
}

export async function updateAssessorNotes(...args: Parameters<typeof _updateNotes>) {
  return _updateNotes(...args)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getC3PAOProfile(): Promise<{ success: boolean; data?: any; error?: string }> {
  return { success: false, error: 'Profile management is on the SaaS platform' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateC3PAOProfile(data: any): Promise<StubResult> {
  return { success: false, error: 'Profile management is on the SaaS platform' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateC3PAOLogo(data: any) {
  return { success: false, error: 'Profile management is on the SaaS platform' }
}

export async function updateEngagementStatus(engagementId: string, status: string): Promise<StubResult> {
  return { success: false, error: 'Status updates sync to SaaS automatically' }
}

export async function addAssessorNotes(engagementId: string, notes: string): Promise<StubResult> {
  return { success: false, error: 'Not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recordAssessmentResult(engagementId: string, result: any, ...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Not available in standalone mode' }
}

export async function startAssessment(engagementId: string): Promise<StubResult> {
  return { success: false, error: 'Not available in standalone mode' }
}

export async function endAssessmentMode(engagementId: string): Promise<StubResult> {
  return { success: false, error: 'Not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function calculateEngagementSPRSScore(engagementId: string): Promise<{ success: boolean; score?: number; data?: any }> {
  return { success: false, score: 0 }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function submitAssessmentForApproval(engagementId: string, ...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function rejectAssessmentSubmission(engagementId: string, ...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Not available in standalone mode' }
}

export async function acknowledgeIntroduction(engagementId: string): Promise<StubResult> {
  return { success: false, error: 'Not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendProposal(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function declineIntroduction(engagementId: string, ...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function assessorUpdateObjectiveStatus(...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Not available in standalone mode' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addTeamMember(data: any): Promise<StubResult> {
  return { success: false, error: 'Team management is on the SaaS platform' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateTeamMember(userId: string, data: any): Promise<StubResult> {
  return { success: false, error: 'Team management is on the SaaS platform' }
}

export async function deleteTeamMember(userId: string): Promise<StubResult> {
  return { success: false, error: 'Team management is on the SaaS platform' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resetTeamMemberPassword(userId: string, ...args: any[]): Promise<StubResult> {
  return { success: false, error: 'Team management is on the SaaS platform' }
}
