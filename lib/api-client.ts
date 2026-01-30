/**
 * SaaS API Client
 *
 * Typed fetch wrapper for communicating with the Bedrock CMMC SaaS platform.
 * Handles authentication, retry logic, and error mapping.
 */

import { getMeta } from './db'

const SAAS_API_URL = () => getMeta('saas_url') || process.env.SAAS_API_URL || 'http://localhost:3001/api/v1/instance'
const INSTANCE_API_KEY = () => getMeta('instance_api_key') || process.env.INSTANCE_API_KEY || ''

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
  assessorToken?: string
  timeout?: number
  retries?: number
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, assessorToken, timeout = 30000, retries = 2 } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Instance-Key': INSTANCE_API_KEY(),
  }

  if (assessorToken) {
    headers['Authorization'] = `Bearer ${assessorToken}`
  }

  const url = `${SAAS_API_URL()}${endpoint}`

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (response.status === 429) {
        // Rate limited — wait and retry
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10)
        await sleep(retryAfter * 1000)
        continue
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new ApiError(response.status, `API ${method} ${endpoint} failed: ${response.status}`, errorBody)
      }

      return await response.json() as T
    } catch (error) {
      lastError = error as Error

      if (error instanceof ApiError) {
        // Don't retry client errors (4xx) except 429
        if (error.status >= 400 && error.status < 500) {
          throw error
        }
      }

      // Retry on network/server errors
      if (attempt < retries) {
        await sleep(Math.pow(2, attempt) * 1000)
      }
    }
  }

  throw lastError || new Error(`API request failed after ${retries + 1} attempts`)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ---- Authentication ----

export interface AuthResponse {
  token: string
  assessor: {
    id: string
    email: string
    name: string
    c3paoId: string
    c3paoName: string
    isLeadAssessor: boolean
    status: string
    phone?: string
    jobTitle?: string
    ccaNumber?: string
    ccpNumber?: string
  }
  c3pao: {
    id: string
    name: string
    status: string
  }
  expiresAt: string
}

export async function authenticateAssessor(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/authenticate', {
    method: 'POST',
    body: { email, password },
  })
}

// ---- Engagements ----

export interface EngagementSummary {
  id: string
  customerName: string
  packageName: string
  targetLevel: string
  status: string
  accessLevel: string
  requestedDate: string | null
  scheduledStartDate: string | null
  scheduledEndDate: string | null
  lastActivityAt: string | null
}

export interface EngagementDetail {
  id: string
  customerId: string
  atoPackageId: string
  c3paoId: string
  leadAssessorId: string | null
  customerName: string
  packageName: string
  targetLevel: string
  status: string
  accessLevel: string
  assessmentModeActive: boolean
  assessmentScope: string | null
  assessmentNotes: string | null
  customerNotes: string | null
  requestedDate: string | null
  acceptedDate: string | null
  scheduledStartDate: string | null
  scheduledEndDate: string | null
  actualStartDate: string | null
  actualCompletionDate: string | null
  assessmentResult: string | null
  findingsCount: number
  poamRequired: boolean
  quotedPrice: number | null
  introductionMessage: string | null
  proposalMessage: string | null
  proposalScope: string | null
  lastMessageAt: string | null
  // Nested data
  atoPackage: {
    id: string
    name: string
    organization: { id: string; name: string } | null
    requirementStatuses?: unknown[]
    objectiveStatuses?: unknown[]
    evidence?: unknown[]
    poams?: unknown[]
    ssp?: { id: string; version: string; status: string } | null
    externalServiceProviders?: { id: string; providerName: string }[]
  } | null
  leadAssessor?: { id: string; name: string; email: string; isLeadAssessor: boolean } | null
  teamAssignments?: unknown[]
  findings?: unknown[]
  report?: unknown
  activities?: unknown[]
  controls?: ControlForAssessment[]
  team?: TeamMember[]
}

export interface ControlForAssessment {
  id: string
  controlIdentifier: string
  title: string
  description: string
  family: string
  objectives?: ObjectiveForAssessment[]
  existingFinding?: {
    determination: string
    assessorId: string
    updatedAt: string
  }
}

export interface ObjectiveForAssessment {
  id: string
  objectiveIdentifier: string
  description: string
  assessmentMethods: string[]
}

export interface TeamMember {
  id: string
  assessorId: string
  assessorName: string
  assessorEmail: string
  role: string
  isLeadAssessor: boolean
  assignedControls?: string[]
}

export interface EvidenceItem {
  id: string
  controlId: string
  fileName: string
  fileType: string
  fileSize: number
  description: string | null
  uploadedAt: string
  downloadUrl?: string
}

export interface PoamItem {
  id: string
  controlId: string
  weakness: string
  milestones: string | null
  scheduledCompletionDate: string | null
  status: string
}

export interface StigItem {
  id: string
  targetId: string
  targetName: string
  benchmarkId: string
  benchmarkTitle: string
  data: string  // JSON
}

export async function fetchEngagements(assessorToken: string): Promise<EngagementSummary[]> {
  return request<EngagementSummary[]>('/engagements', { assessorToken })
}

export async function fetchEngagement(id: string, assessorToken: string): Promise<EngagementDetail> {
  return request<EngagementDetail>(`/engagements/${id}`, { assessorToken })
}

export async function fetchControls(engagementId: string, assessorToken: string): Promise<ControlForAssessment[]> {
  return request<ControlForAssessment[]>(`/engagements/${engagementId}/controls`, { assessorToken })
}

export async function fetchEvidence(engagementId: string, assessorToken: string): Promise<EvidenceItem[]> {
  return request<EvidenceItem[]>(`/engagements/${engagementId}/evidence`, { assessorToken })
}

export async function fetchPoams(engagementId: string, assessorToken: string): Promise<PoamItem[]> {
  return request<PoamItem[]>(`/engagements/${engagementId}/poams`, { assessorToken })
}

export async function fetchStigs(engagementId: string, assessorToken: string): Promise<StigItem[]> {
  return request<StigItem[]>(`/engagements/${engagementId}/stigs`, { assessorToken })
}

export async function fetchTeam(engagementId: string, assessorToken: string): Promise<TeamMember[]> {
  return request<TeamMember[]>(`/engagements/${engagementId}/team`, { assessorToken })
}

export async function fetchReferenceData(key: string, assessorToken: string): Promise<unknown> {
  return request<unknown>(`/reference/${key}`, { assessorToken })
}

// ---- Push Endpoints ----

export interface FindingPayload {
  id: string
  controlId: string
  objectiveId?: string
  determination: string | null
  assessmentMethods: string[]
  findingText: string | null
  objectiveEvidence: string | null
  deficiency: string | null
  recommendation: string | null
  riskLevel: string | null
  version: number
}

export async function pushFindings(engagementId: string, findings: FindingPayload[], assessorToken: string): Promise<{ synced: number; conflicts: string[] }> {
  return request<{ synced: number; conflicts: string[] }>(`/engagements/${engagementId}/findings/bulk`, {
    method: 'POST',
    body: { findings },
    assessorToken,
  })
}

export async function pushFinding(engagementId: string, finding: FindingPayload, assessorToken: string): Promise<{ success: boolean; conflict?: boolean }> {
  return request<{ success: boolean; conflict?: boolean }>(`/engagements/${engagementId}/findings`, {
    method: 'POST',
    body: finding,
    assessorToken,
  })
}

export async function pushReport(engagementId: string, report: { id: string; data: string; status: string }, assessorToken: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/engagements/${engagementId}/report`, {
    method: 'POST',
    body: report,
    assessorToken,
  })
}

export async function pushEngagementStatus(engagementId: string, status: string, assessorToken: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/engagements/${engagementId}/status`, {
    method: 'POST',
    body: { status },
    assessorToken,
  })
}

// ---- Heartbeat ----

export async function sendHeartbeat(): Promise<{ ok: boolean; serverTime: string }> {
  return request<{ ok: boolean; serverTime: string }>('/heartbeat', {
    method: 'POST',
    body: {
      version: process.env.npm_package_version || '0.1.0',
      timestamp: new Date().toISOString(),
    },
  })
}

// ---- Evidence Download Proxy ----

export async function fetchEvidenceFile(engagementId: string, evidenceId: string, assessorToken: string): Promise<Response> {
  const url = `${SAAS_API_URL()}/engagements/${engagementId}/evidence/${evidenceId}/download`
  const response = await fetch(url, {
    headers: {
      'X-Instance-Key': INSTANCE_API_KEY(),
      'Authorization': `Bearer ${assessorToken}`,
    },
  })

  if (!response.ok) {
    throw new ApiError(response.status, `Evidence download failed: ${response.status}`)
  }

  return response
}
