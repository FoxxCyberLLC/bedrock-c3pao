/**
 * Go API Client
 *
 * Typed fetch wrapper for communicating with the Bedrock CMMC API (Go backend).
 * All data flows through the Go API — no direct database access.
 */

const API_URL = process.env.BEDROCK_API_URL || 'http://localhost:8080'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface ApiEnvelope<T> {
  data: T
  error: { message: string; code: string } | null
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string
  timeout?: number
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, timeout = 30000 } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Inject instance API key for server-side tracking
  // Check env var first, then fall back to instance config file
  let instanceKey = process.env.INSTANCE_API_KEY
  if (!instanceKey) {
    try {
      const { getInstanceConfig } = await import('./instance-config')
      const config = getInstanceConfig()
      if (config?.instanceApiKey) {
        instanceKey = config.instanceApiKey
      }
    } catch {
      // instance-config not available (e.g. edge runtime)
    }
  }
  if (instanceKey) {
    headers['X-Instance-Key'] = instanceKey
  }

  const url = `${API_URL}${endpoint}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    })

    clearTimeout(timer)

    const json = await response.json() as ApiEnvelope<T>

    if (!response.ok || json.error) {
      throw new ApiError(
        response.status,
        json.error?.message || `API ${method} ${endpoint} failed: ${response.status}`,
        json.error?.code
      )
    }

    return json.data
  } catch (error) {
    clearTimeout(timer)
    if (error instanceof ApiError) throw error
    throw new ApiError(0, error instanceof Error ? error.message : 'Network error')
  }
}

// ---- Authentication ----

export interface LoginResponse {
  token: string
  userId: string
  email: string
  name: string
  role: string
  userType: string
  orgId: string
  orgName?: string
  isLeadAssessor?: boolean
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password, userType: 'c3pao' },
  })
}

export interface MeResponse {
  id: string
  email: string
  name: string
  role: string
  status: string
  userType: string
  orgId: string
  orgName?: string
  isLeadAssessor?: boolean
}

export async function apiMe(token: string): Promise<MeResponse> {
  return apiRequest<MeResponse>('/api/auth/me', { token })
}

export async function apiRefreshToken(token: string): Promise<{ token: string }> {
  return apiRequest<{ token: string }>('/api/auth/refresh', {
    method: 'POST',
    token,
  })
}

// ---- C3PAO Assessments ----

export interface EngagementSummary {
  id: string
  customerId: string
  atoPackageId: string
  c3paoId: string
  leadAssessorId: string | null
  status: string
  accessLevel: string
  targetLevel: string
  requestedDate: string
  acceptedDate: string | null
  scheduledStartDate: string | null
  scheduledEndDate: string | null
  actualStartDate: string | null
  actualCompletionDate: string | null
  assessmentScope: string | null
  assessmentNotes: string | null
  assessmentResult: string | null
  findingsCount: number | null
  poamRequired: boolean | null
  assessmentModeActive: boolean
  createdAt: string
  updatedAt: string
  packageName: string
  organizationName: string
  leadAssessorName: string | null
}

export interface ControlView {
  id: string
  requirementId: string
  familyCode: string
  familyName: string
  title: string
  basicRequirement: string
  cmmcLevel: string
  sortOrder: number
  status: string | null
  implementationNotes: string | null
  implementationType: string | null
  processOwner: string | null
}

export interface EvidenceView {
  id: string
  fileName: string
  fileUrl: string | null
  mimeType: string | null
  fileSize: number | null
  description: string | null
  version: number
  uploadedBy: string | null
  uploadedAt: string
  expirationDate: string | null
  requirementIds: string[]
}

export interface SSPView {
  id: string
  atoPackageId: string
  version: string
  status: string
  systemName: string | null
  systemDescription: string | null
  systemBoundary: string | null
  systemEnvironment: string | null
  systemArchitecture: string | null
  controlStatements: string | null
  securityPolicies: string | null
  incidentResponse: string | null
  contingencyPlan: string | null
  generatedAt: string | null
  lastModified: string
  createdAt: string
}

export interface POAMView {
  id: string
  type: string
  title: string
  description: string
  riskLevel: string
  status: string
  remediationPlan: string
  scheduledCompletionDate: string
  actualCompletionDate: string | null
  deadline: string
  daysToRemediate: number
  createdAt: string
  milestones: MilestoneView[]
}

export interface MilestoneView {
  description: string
  dueDate: string
  completed: boolean
  completedDate: string | null
}

export interface FindingView {
  id: string
  engagementId: string
  requirementId: string
  requirementCode: string
  determination: string
  methodInterview: boolean
  methodExamine: boolean
  methodTest: boolean
  finding: string | null
  objectiveEvidence: string | null
  deficiency: string | null
  recommendation: string | null
  riskLevel: string | null
  evidenceReviewed: string | null
  assessedById: string | null
  assessedAt: string | null
  version: number
  editingById: string | null
  editingByName: string | null
  editingAt: string | null
  reviewStatus: string | null
  reviewedById: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface NoteView {
  id: string
  engagementId: string
  content: string
  authorId: string
  authorName: string | null
  createdAt: string
}

export interface ReportData {
  engagement: EngagementSummary
  totalControls: number
  assessedControls: number
  findings: FindingView[]
  stats: {
    met: number
    notMet: number
    notApplicable: number
    notAssessed: number
  }
}

export interface EMassExportFinding {
  controlId: string
  familyCode: string
  title: string
  determination: string
  methodInterview: boolean
  methodExamine: boolean
  methodTest: boolean
  finding: string | null
  objectiveEvidence: string | null
  deficiency: string | null
  recommendation: string | null
  riskLevel: string | null
}

export interface EMassExportPOAM {
  title: string
  description: string
  riskLevel: string
  status: string
  remediationPlan: string
  scheduledCompletionDate: string
}

// EMassExportData matches the Go backend AssessmentExport struct exactly.
export interface EMassExportData {
  engagementId: string
  exportDate: string
  cmmcLevel: string
  organization: string
  assessorOrganization: string
  systemName: string | null
  assessmentStartDate: string | null
  assessmentEndDate: string | null
  findings: EMassExportFinding[]
  poams: EMassExportPOAM[]
}

// ---- Fetch Functions ----

export async function fetchAssessments(token: string): Promise<EngagementSummary[]> {
  return apiRequest<EngagementSummary[]>('/api/c3pao/assessments', { token })
}

export async function fetchControls(engagementId: string, token: string): Promise<ControlView[]> {
  return apiRequest<ControlView[]>(`/api/c3pao/assessments/${engagementId}/controls`, { token })
}

export async function fetchEvidence(engagementId: string, token: string): Promise<EvidenceView[]> {
  return apiRequest<EvidenceView[]>(`/api/c3pao/assessments/${engagementId}/evidence`, { token })
}

export interface EvidenceDownloadURLResponse {
  downloadUrl: string
  fileName: string
  expiresAt: string
}

export async function fetchEvidenceDownloadURL(engagementId: string, evidenceId: string, token: string): Promise<EvidenceDownloadURLResponse> {
  return apiRequest<EvidenceDownloadURLResponse>(`/api/c3pao/assessments/${engagementId}/evidence/${evidenceId}/download-url`, { token })
}

export async function fetchSSP(engagementId: string, token: string): Promise<SSPView> {
  return apiRequest<SSPView>(`/api/c3pao/assessments/${engagementId}/ssp`, { token })
}

export async function fetchPOAMs(engagementId: string, token: string): Promise<POAMView[]> {
  return apiRequest<POAMView[]>(`/api/c3pao/assessments/${engagementId}/poam`, { token })
}

export async function fetchFindings(engagementId: string, token: string): Promise<FindingView[]> {
  return apiRequest<FindingView[]>(`/api/c3pao/assessments/${engagementId}/findings`, { token })
}

export async function fetchNotes(engagementId: string, token: string): Promise<NoteView[]> {
  return apiRequest<NoteView[]>(`/api/c3pao/assessments/${engagementId}/notes`, { token })
}

export async function fetchReport(engagementId: string, token: string): Promise<ReportData> {
  return apiRequest<ReportData>(`/api/c3pao/assessments/${engagementId}/report`, { token })
}

export async function fetchEMassExport(engagementId: string, token: string): Promise<EMassExportData> {
  return apiRequest<EMassExportData>(`/api/c3pao/assessments/${engagementId}/export/emass`, { token })
}

// ---- Write Functions ----

export interface CreateFindingInput {
  requirementId: string
  determination: string
  methodInterview?: boolean
  methodExamine?: boolean
  methodTest?: boolean
  finding?: string
  objectiveEvidence?: string
  deficiency?: string
  recommendation?: string
  riskLevel?: string
  evidenceReviewed?: string
}

export async function createFinding(engagementId: string, input: CreateFindingInput, token: string): Promise<FindingView> {
  return apiRequest<FindingView>(`/api/c3pao/assessments/${engagementId}/findings`, {
    method: 'POST',
    body: input,
    token,
  })
}

export interface UpdateFindingInput {
  determination?: string
  methodInterview?: boolean
  methodExamine?: boolean
  methodTest?: boolean
  finding?: string
  objectiveEvidence?: string
  deficiency?: string
  recommendation?: string
  riskLevel?: string
  evidenceReviewed?: string
}

export async function updateFinding(engagementId: string, findingId: string, input: UpdateFindingInput, token: string): Promise<FindingView> {
  return apiRequest<FindingView>(`/api/c3pao/assessments/${engagementId}/findings/${findingId}`, {
    method: 'PUT',
    body: input,
    token,
  })
}

export async function reviewFinding(engagementId: string, findingId: string, body: { status: string; notes?: string }, token: string): Promise<FindingView> {
  return apiRequest<FindingView>(`/api/c3pao/assessments/${engagementId}/findings/${findingId}/review`, {
    method: 'PATCH',
    body,
    token,
  })
}

export async function createNote(engagementId: string, content: string, token: string): Promise<NoteView> {
  return apiRequest<NoteView>(`/api/c3pao/assessments/${engagementId}/notes`, {
    method: 'POST',
    body: { content },
    token,
  })
}

// ---- Check-ins (Public Status Updates) ----

export interface CheckinView {
  id: string
  title: string
  description?: string | null
  authorName: string
  createdAt: string
}

export async function fetchCheckins(engagementId: string, token: string): Promise<CheckinView[]> {
  return apiRequest<CheckinView[]>(`/api/c3pao/assessments/${engagementId}/checkins`, { token })
}

export async function createCheckin(
  engagementId: string,
  input: { title: string; description?: string },
  token: string
): Promise<CheckinView> {
  return apiRequest<CheckinView>(`/api/c3pao/assessments/${engagementId}/checkins`, {
    method: 'POST',
    body: input,
    token,
  })
}

// ---- Engagement Detail & Status ----

export async function fetchEngagementDetail(engagementId: string, token: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/api/c3pao/assessments/${engagementId}`, { token })
}

export async function updateEngagementStatus(engagementId: string, body: { status: string; assessmentResult?: string; resultNotes?: string }, token: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/api/c3pao/assessments/${engagementId}/status`, {
    method: 'PATCH',
    body,
    token,
  })
}

export async function toggleAssessmentMode(engagementId: string, active: boolean, token: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/api/c3pao/assessments/${engagementId}/assessment-mode`, {
    method: 'POST',
    body: { active },
    token,
  })
}

// ---- Team Management ----

export interface TeamMember {
  id: string
  assessorId: string
  name: string
  email: string
  role: string
  assessorType: string
  jobTitle?: string | null
  assignedAt: string
  domains: string[]
}

export async function fetchTeam(engagementId: string, token: string): Promise<TeamMember[]> {
  return apiRequest<TeamMember[]>(`/api/c3pao/assessments/${engagementId}/team`, { token })
}

export async function fetchAvailableAssessors(engagementId: string, token: string): Promise<Record<string, unknown>[]> {
  return apiRequest<Record<string, unknown>[]>(`/api/c3pao/assessments/${engagementId}/team/available`, { token })
}

export async function addTeamMember(engagementId: string, body: { assessorId: string; role: string }, token: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/api/c3pao/assessments/${engagementId}/team`, {
    method: 'POST',
    body,
    token,
  })
}

export async function updateTeamMemberRole(engagementId: string, assessorId: string, role: string, token: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/api/c3pao/assessments/${engagementId}/team/${assessorId}/role`, {
    method: 'PATCH',
    body: { role },
    token,
  })
}

export async function removeTeamMember(engagementId: string, assessorId: string, token: string): Promise<void> {
  return apiRequest<void>(`/api/c3pao/assessments/${engagementId}/team/${assessorId}`, {
    method: 'DELETE',
    token,
  })
}

// ---- Domain Assignment ----

export interface DomainAssignment {
  id: string
  engagementAssessorId: string
  assessorId: string
  assessorName: string
  familyCode: string
  assignedAt: string
}

export async function fetchDomains(engagementId: string, token: string): Promise<DomainAssignment[]> {
  return apiRequest<DomainAssignment[]>(`/api/c3pao/assessments/${engagementId}/domains`, { token })
}

export async function fetchMyDomains(engagementId: string, token: string): Promise<string[]> {
  return apiRequest<string[]>(`/api/c3pao/assessments/${engagementId}/domains/mine`, { token })
}

export async function setAssessorDomains(engagementId: string, assessorId: string, familyCodes: string[], token: string): Promise<DomainAssignment[]> {
  return apiRequest<DomainAssignment[]>(`/api/c3pao/assessments/${engagementId}/domains/${assessorId}`, {
    method: 'PUT',
    body: { familyCodes },
    token,
  })
}

// ---- Planning & Proposals ----

export interface PlanningData {
  engagementId?: string
  assessmentScope: string | null
  assessmentMethodology: string | null
  planningNotes: string | null
  assessmentTimeline: string | null
  scheduledStartDate: string | null
  scheduledEndDate: string | null
}

export async function fetchPlanning(engagementId: string, token: string): Promise<PlanningData> {
  return apiRequest<PlanningData>(`/api/c3pao/assessments/${engagementId}/planning`, { token })
}

export async function updatePlanning(engagementId: string, body: Partial<PlanningData>, token: string): Promise<PlanningData> {
  return apiRequest<PlanningData>(`/api/c3pao/assessments/${engagementId}/planning`, {
    method: 'PUT',
    body,
    token,
  })
}

export async function sendProposal(engagementId: string, body: Record<string, unknown>, token: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/api/c3pao/assessments/${engagementId}/planning/proposal`, {
    method: 'POST',
    body,
    token,
  })
}

export async function acknowledgeIntroduction(engagementId: string, token: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/api/c3pao/assessments/${engagementId}/planning/acknowledge`, {
    method: 'POST',
    token,
  })
}

// ---- Progress ----

export interface DailyProgress {
  total: number
  assessed: number
  met: number
  notMet: number
  notApplicable: number
  notAssessed: number
  date?: string
}

export interface AssessorProgress {
  assessorId: string
  assessorName: string
  assessed: number
  met: number
  notMet: number
  notApplicable: number
}

export interface DomainProgress {
  familyCode: string
  familyName: string
  total: number
  assessed: number
  met: number
  notMet: number
  notApplicable: number
}

export async function fetchDailyProgress(engagementId: string, token: string, date?: string): Promise<DailyProgress> {
  const qs = date ? `?date=${date}` : ''
  return apiRequest<DailyProgress>(`/api/c3pao/assessments/${engagementId}/progress/daily${qs}`, { token })
}

export async function fetchProgressByAssessor(engagementId: string, token: string): Promise<AssessorProgress[]> {
  return apiRequest<AssessorProgress[]>(`/api/c3pao/assessments/${engagementId}/progress/by-assessor`, { token })
}

export async function fetchProgressByDomain(engagementId: string, token: string): Promise<DomainProgress[]> {
  return apiRequest<DomainProgress[]>(`/api/c3pao/assessments/${engagementId}/progress/by-domain`, { token })
}

// ---- Objectives ----

export interface ObjectiveView {
  id: string
  objectiveId: string
  objectiveReference: string
  requirementId: string
  familyCode: string
  familyName: string
  description: string
  status: string
  assessmentNotes: string | null
  evidenceDescription: string | null
  artifactsReviewed: string | null
  interviewees: string | null
  examineDescription: string | null
  testDescription: string | null
  timeToAssessMinutes: number | null
  inheritedStatus: string | null
  policyReference: string | null
  procedureReference: string | null
  implementationStatement: string | null
  responsibilityDescription: string | null
  assessorQuestionsForOSC: string | null
  nistQuestionsForOSC: string | null
  officialAssessment: boolean
  officialAssessorId: string | null
  officialAssessedAt: string | null
  assessedBy: string | null
  assessedAt: string | null
  version: number
  editingById: string | null
  editingByName: string | null
  editingAt: string | null
  // OSC self-assessment context
  oscStatus: string | null
  oscImplementationStatement: string | null
  oscEvidenceDescription: string | null
  oscAssessmentNotes: string | null
  oscPolicyReference: string | null
  oscProcedureReference: string | null
  oscResponsibilityDescription: string | null
  createdAt: string
  updatedAt: string
}

export async function fetchObjectives(engagementId: string, token: string): Promise<ObjectiveView[]> {
  return apiRequest<ObjectiveView[]>(`/api/c3pao/assessments/${engagementId}/objectives`, { token })
}

export async function updateObjective(engagementId: string, objectiveId: string, body: Record<string, unknown>, token: string): Promise<ObjectiveView> {
  return apiRequest<ObjectiveView>(`/api/c3pao/assessments/${engagementId}/objectives/${objectiveId}`, {
    method: 'PUT',
    body,
    token,
  })
}

export async function lockObjective(engagementId: string, objectiveId: string, token: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/api/c3pao/assessments/${engagementId}/objectives/${objectiveId}/lock`, {
    method: 'POST',
    token,
  })
}

export async function unlockObjective(engagementId: string, objectiveId: string, token: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/api/c3pao/assessments/${engagementId}/objectives/${objectiveId}/lock`, {
    method: 'DELETE',
    token,
  })
}

export async function bulkUpdateObjectives(engagementId: string, body: { updates: { objStatusId: string; status: string; version: number }[] }, token: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/api/c3pao/assessments/${engagementId}/objectives/bulk`, {
    method: 'POST',
    body,
    token,
  })
}

export async function fetchObjectiveHistory(engagementId: string, objectiveId: string, token: string): Promise<Record<string, unknown>[]> {
  return apiRequest<Record<string, unknown>[]>(`/api/c3pao/assessments/${engagementId}/objectives/${objectiveId}/history`, { token })
}

// ---- STIGs ----

export interface STIGData {
  targets: Record<string, unknown>[]
  statistics: Record<string, unknown>
}

export async function fetchSTIGs(engagementId: string, token: string): Promise<STIGData> {
  return apiRequest<STIGData>(`/api/c3pao/assessments/${engagementId}/stigs`, { token })
}

// ---- Profile ----

export interface C3PAOProfile {
  id: string
  name: string
  legalName?: string | null
  email: string
  phone?: string | null
  website?: string | null
  description?: string | null
  logo?: string | null
  address1?: string | null
  address2?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  country?: string | null
  dunsNumber?: string | null
  cageCode?: string | null
  cyberAbAccreditationId?: string | null
  accreditationDate?: string | null
  accreditationExpiry?: string | null
  authorizedLevels?: string | null
  status: string
  isListed: boolean
  averageRating?: number | null
  totalReviews: number
  pricingInfo?: string | null
  typicalTimeline?: string | null
  specialties?: string | null
  servicesOffered?: string | null
  teamStats: {
    total: number
    active: number
    cca: number
    ccp: number
  }
  engagementStats: {
    total: number
    active: number
    completed: number
    completedThisYear: number
  }
}

export async function fetchProfile(token: string): Promise<C3PAOProfile> {
  return apiRequest<C3PAOProfile>('/api/c3pao/profile', { token })
}

export async function updateProfile(body: Partial<C3PAOProfile>, token: string): Promise<C3PAOProfile> {
  return apiRequest<C3PAOProfile>('/api/c3pao/profile', {
    method: 'PATCH',
    body,
    token,
  })
}

// ---- Assessment Report ----

export interface AssessmentReport {
  id: string
  engagementId: string
  status: string
  version: string | null
  executiveSummary: string | null
  scopeDescription: string | null
  methodology: string | null
  findingsSummary: string | null
  recommendations: string | null
  conclusion: string | null
  pdfUrl: string | null
  preparedById: string | null
  preparedByName: string | null
  preparedAt: string | null
  reviewedById: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  approvedById: string | null
  approvedByName: string | null
  approvedAt: string | null
  deliveredAt: string | null
  createdAt: string
  updatedAt: string
}

export async function fetchAssessmentReport(engagementId: string, token: string): Promise<AssessmentReport> {
  return apiRequest<AssessmentReport>(`/api/c3pao/assessments/${engagementId}/report/assessment`, { token })
}

export async function saveAssessmentReport(engagementId: string, body: Partial<AssessmentReport>, token: string): Promise<AssessmentReport> {
  return apiRequest<AssessmentReport>(`/api/c3pao/assessments/${engagementId}/report/assessment`, {
    method: 'POST',
    body,
    token,
  })
}

export async function updateReportStatus(engagementId: string, status: string, token: string): Promise<AssessmentReport> {
  return apiRequest<AssessmentReport>(`/api/c3pao/assessments/${engagementId}/report/assessment/status`, {
    method: 'PATCH',
    body: { status },
    token,
  })
}

// ---- Stats ----

export interface DomainStats {
  familyCode: string
  familyName: string
  total: number
  met: number
  notMet: number
  notApplicable: number
  notAssessed: number
}

export interface StatsResponse {
  domains: DomainStats[]
  totals: DomainStats
}

export async function fetchStats(engagementId: string, token: string): Promise<StatsResponse> {
  return apiRequest<StatsResponse>(`/api/c3pao/assessments/${engagementId}/stats`, { token })
}

// ---- Workload ----

export interface AssessorWorkloadItem {
  assessorId: string
  assessorName: string
  assessorEmail: string
  assessorType: string
  activeEngagements: number
  objectivesAssessed: number
  domainsAssigned: number
}

export async function fetchWorkload(token: string): Promise<AssessorWorkloadItem[]> {
  return apiRequest<AssessorWorkloadItem[]>('/api/c3pao/workload', { token })
}

// ---- Org-level C3PAO User Management ----

export interface C3PAOUserItem {
  id: string
  email: string
  name: string
  phone: string | null
  jobTitle: string | null
  ccaNumber: string | null
  ccpNumber: string | null
  isLeadAssessor: boolean
  assessorType: string
  status: string
  lastLogin: string | null
  createdAt: string
  engagements: number
}

export async function fetchC3PAOUsers(token: string): Promise<C3PAOUserItem[]> {
  return apiRequest<C3PAOUserItem[]>('/api/c3pao/users', { token })
}

export async function fetchC3PAOCurrentUser(token: string): Promise<C3PAOUserItem> {
  return apiRequest<C3PAOUserItem>('/api/c3pao/users/me', { token })
}

export async function createC3PAOUser(body: {
  name: string
  email: string
  password: string
  phone?: string
  jobTitle?: string
  ccaNumber?: string
  ccpNumber?: string
  isLeadAssessor: boolean
  assessorType?: string
}, token: string): Promise<C3PAOUserItem> {
  return apiRequest<C3PAOUserItem>('/api/c3pao/users', { method: 'POST', body, token })
}

export async function updateC3PAOUser(userId: string, body: {
  name?: string
  phone?: string
  jobTitle?: string
  ccaNumber?: string
  ccpNumber?: string
  isLeadAssessor?: boolean
  status?: string
}, token: string): Promise<unknown> {
  return apiRequest<unknown>(`/api/c3pao/users/${userId}`, { method: 'PUT', body, token })
}

export async function deleteC3PAOUser(userId: string, token: string): Promise<unknown> {
  return apiRequest<unknown>(`/api/c3pao/users/${userId}`, { method: 'DELETE', token })
}
