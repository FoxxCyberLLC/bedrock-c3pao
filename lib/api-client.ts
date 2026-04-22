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
      const config = await getInstanceConfig()
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
  requirementStatusId: string
  assessmentNotes: string | null
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

  // System info
  systemName: string | null
  systemAbbreviation: string | null
  systemCategory: string | null
  systemPurpose: string | null
  systemDescription: string | null
  systemArchitecture: string | null
  systemBoundary: string | null
  systemEnvironment: string | null

  // Network/data flow
  networkDiagram: string | null
  networkDiagramUrl: string | null
  networkDiagramFileName: string | null
  dataFlow: string | null
  dataFlowDiagramUrl: string | null
  dataFlowDiagramFileName: string | null

  // Personnel
  systemOwner: string | null
  systemOwnerPhone: string | null
  systemOwnerEmail: string | null
  securityOfficer: string | null
  securityOfficerPhone: string | null
  securityOfficerEmail: string | null
  authorizingOfficial: string | null
  authorizingOfficialPhone: string | null
  authorizingOfficialEmail: string | null
  preparedByName: string | null
  preparedByEmail: string | null
  preparedByPhone: string | null
  preparedByTitle: string | null
  preparedByDepartment: string | null
  distributionList: string | null

  // Approval
  approvedBy: string | null
  approvedAt: string | null
  expirationDate: string | null
  revisionDate: string | null

  // Operating model
  operatingModelPublicCloud: boolean
  operatingModelPrivateCloud: boolean
  operatingModelDataCenter: boolean
  operatingModelHybrid: boolean
  operatingModelHybridExplain: string | null
  operatingModelDispersed: boolean
  operatingModelAirGapped: boolean
  operatingModelOther: boolean
  operatingModelOtherExplain: string | null

  // CUI scope
  cuiEndUserWorkstations: boolean
  cuiMobileDevices: boolean
  cuiServers: boolean
  cuiIndustrialControlSystems: boolean
  cuiInternalApplications: boolean
  cuiSaas: boolean
  cuiPaas: boolean
  cuiIaas: boolean
  cuiOther: boolean
  cuiOtherExplain: string | null
  cuiOverview: string | null

  // Policies and plans
  controlStatements: string | null
  securityPolicies: string | null
  incidentResponse: string | null
  contingencyPlan: string | null
  configurationMgmt: string | null
  maintenanceProcedures: string | null
  trainingProgram: string | null
  poamSummary: string | null
  deficienciesSummary: string | null

  // JSON fields
  revisionHistory: string | null
  keyStakeholders: string | null
  rolesPrivileges: string | null
  additionalRoles: string | null
  acronyms: string | null
  references: string | null
  changeLog: string | null
  interconnections: string | null
  assetInventorySummary: string | null
  supplyChainProviders: string | null

  // Other
  contractNumber: string | null
  contractsContainingCUI: string | null
  documentationRepository: string | null
  dataProtectionNotes: string | null
  interconnectivityOverview: string | null
  identificationAuthOverview: string | null
  supplyChainOverview: string | null
  maintenanceSupportPlan: string | null
  commonControlProvider: string | null
  additionalInfo: string | null
  userCount: number | null
  adminCount: number | null

  // SDLC
  operationalPhase: string | null
  sdlcMilestones: string | null
  sdlcInitiatePlanned: string | null
  sdlcInitiateReached: string | null
  sdlcDevelopPlanned: string | null
  sdlcDevelopReached: string | null
  sdlcImplementPlanned: string | null
  sdlcImplementReached: string | null
  sdlcOperatePlanned: string | null
  sdlcOperateReached: string | null
  sdlcDisposePlanned: string | null
  sdlcDisposeReached: string | null

  // Regulatory
  statutoryRequirements: string | null
  regulatoryRequirements: string | null
  contractualRequirements: string | null

  // PDF (presigned URL only)
  pdfUrl: string | null

  // Imported
  importedFileUrl: string | null
  importedFileName: string | null
  importedAt: string | null

  // Timestamps
  generatedAt: string | null
  generatedBy: string | null
  lastModified: string
  createdAt: string
}

export interface AssetView {
  id: string
  name: string
  assetType: string
  assetCategory: string
  description: string | null
  ipAddress: string | null
  macAddress: string | null
  hostname: string | null
  processesFCI: boolean
  processesCUI: boolean
  manufacturer: string | null
  model: string | null
  serialNumber: string | null
  softwareVersion: string | null
  operatingSystem: string | null
  location: string | null
  facility: string | null
  owner: string | null
  department: string | null
  isManaged: boolean
  patchLevel: string | null
  lastPatchDate: string | null
  vulnerabilityScore: number | null
  atoPackageId: string
  createdAt: string
  updatedAt: string
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

export async function updateControlNotes(engagementId: string, requirementStatusId: string, assessmentNotes: string, token: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(`/api/c3pao/assessments/${engagementId}/controls/${requirementStatusId}/notes`, {
    method: 'PATCH',
    body: { assessmentNotes },
    token,
  })
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

export async function fetchAssets(engagementId: string, token: string): Promise<AssetView[]> {
  return apiRequest<AssetView[]>(`/api/c3pao/assessments/${engagementId}/assets`, { token })
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

// ---- Workload (Task 12) ----

export interface WorkloadEngagement {
  id: string
  packageName: string
  organizationName: string
  status: string
  role: string
  currentPhase?: string
}

export interface AssessorSkillItem {
  familyCode: string
  proficiency: number
}

export interface AssessorWorkloadItem {
  assessorId: string
  assessorName: string
  assessorEmail: string
  assessorType: string
  isLeadAssessor: boolean
  activeEngagements: number
  pendingEngagements: number
  completedEngagements: number
  objectivesAssessed: number
  domainsAssigned: number
  ccaExpiresAt: string | null
  ccpExpiresAt: string | null
  engagements: WorkloadEngagement[]
  skills: AssessorSkillItem[]
}

export async function fetchWorkload(token: string): Promise<AssessorWorkloadItem[]> {
  return apiRequest<AssessorWorkloadItem[]>('/api/c3pao/workload', { token })
}

export async function updateAssessorSkills(
  assessorId: string,
  skills: AssessorSkillItem[],
  token: string,
): Promise<AssessorSkillItem[]> {
  return apiRequest<AssessorSkillItem[]>(
    `/api/c3pao/users/${assessorId}/skills`,
    {
      method: 'PUT',
      body: { skills },
      token,
    },
  )
}

// ---- Portfolio (lead-assessor dashboard + kanban + engagements list) ----

/**
 * KPI rollup returned by GET /api/c3pao/assessments/portfolio-stats.
 *
 * ⚠️ Keep in sync with the Go `PortfolioStats` struct in
 * `bedrock-cmmc-api/internal/c3pao/portfolio_service.go`. The Go struct is
 * locked by `TestPortfolioStats_Shape` / `TestPortfolioStats_JSONTags`.
 */
export interface PortfolioStats {
  activeCount: number
  atRiskCount: number
  preBriefThisWeek: number
  qaDueCount: number
  certsExpiring30d: number
  poamCloseoutsDue: number
  /** Oldest-first array of 8 weekly completion counts for the sparkline. */
  throughputLast8Weeks: number[]
}

/**
 * A single row returned by GET /api/c3pao/assessments/portfolio-list.
 *
 * Pre-joined progress stats (`objectivesTotal` / `objectivesAssessed`) avoid
 * the N+1 fetchStats pattern on the kanban board (Task 5) and engagements
 * list (Task 7).
 */
export interface PortfolioListItem {
  id: string
  packageName: string
  organizationName: string
  status: string
  /** Task 8 currentPhase column. Null for rows created before the backfill. */
  currentPhase: string | null
  leadAssessorId: string | null
  leadAssessorName: string | null
  scheduledStartDate: string | null
  scheduledEndDate: string | null
  daysInPhase: number
  objectivesTotal: number
  objectivesAssessed: number
  assessmentResult: string | null
  /** Task 8 cert + POA&M metadata. Null for not-yet-issued certificates. */
  certStatus: string | null
  certExpiresAt: string | null
  poamCloseoutDue: string | null
  reevalWindowOpenUntil: string | null
  createdAt: string
  updatedAt: string
}

export async function fetchPortfolioStats(token: string): Promise<PortfolioStats> {
  return apiRequest<PortfolioStats>('/api/c3pao/assessments/portfolio-stats', {
    token,
  })
}

export async function fetchPortfolioList(
  token: string,
): Promise<PortfolioListItem[]> {
  return apiRequest<PortfolioListItem[]>('/api/c3pao/assessments/portfolio-list', {
    token,
  })
}

// ---- CAP v2.0 phase tracking + lifecycle (Task 8) ----

/** Canonical CAP v2.0 lifecycle phases. */
export type EngagementPhaseName = 'PRE_ASSESS' | 'ASSESS' | 'REPORT' | 'CLOSE_OUT'

/**
 * Full lifecycle metadata for an engagement. Returned by
 * GET /api/c3pao/assessments/:id/phase.
 *
 * ⚠️ Keep in sync with the Go `EngagementPhase` struct in
 * bedrock-cmmc-api/internal/c3pao/phase_service.go.
 */
export interface EngagementPhase {
  currentPhase?: EngagementPhaseName | null
  phaseEnteredAt?: string | null
  contractExecutedAt?: string | null
  preAssessFormQaStatus?: string | null
  preAssessFormUploadedAt?: string | null
  inBriefDate?: string | null
  outBriefDate?: string | null
  reportQaStatus?: string | null
  appealsWindowOpenUntil?: string | null
  reevalWindowOpenUntil?: string | null
  certUid?: string | null
  certStatus?: string | null
  certStatusDate?: string | null
  certIssuedAt?: string | null
  certExpiresAt?: string | null
  poamCloseoutDue?: string | null
  certSignedById?: string | null
  certSignedByName?: string | null
}

/** Single timeline entry from GET /api/c3pao/assessments/:id/lifecycle. */
export interface LifecycleEvent {
  type: string
  date: string
  label: string
  actor?: string | null
}

export async function fetchEngagementPhase(
  engagementId: string,
  token: string,
): Promise<EngagementPhase> {
  return apiRequest<EngagementPhase>(
    `/api/c3pao/assessments/${engagementId}/phase`,
    { token },
  )
}

export async function updateEngagementPhase(
  engagementId: string,
  phase: EngagementPhaseName,
  token: string,
): Promise<EngagementPhase> {
  return apiRequest<EngagementPhase>(
    `/api/c3pao/assessments/${engagementId}/phase`,
    {
      method: 'PUT',
      body: { phase },
      token,
    },
  )
}

export async function fetchEngagementLifecycle(
  engagementId: string,
  token: string,
): Promise<LifecycleEvent[]> {
  return apiRequest<LifecycleEvent[]>(
    `/api/c3pao/assessments/${engagementId}/lifecycle`,
    { token },
  )
}

// ---- Pre-assessment readiness checklist (Task 9) ----

/**
 * CAP v2.0 pre-assessment readiness checklist returned by
 * GET /api/c3pao/assessments/:id/pre-assess.
 *
 * 4 derived items (SSP reviewed, BoE confirmed, COI cleared, team composed)
 * reflect current state via joins. 4 manual items (contract, form drafted,
 * form QA'd, form uploaded) are toggleable by the lead assessor.
 */
export interface PreAssessChecklist {
  contractExecutedAt: string | null
  preAssessFormDrafted: boolean
  preAssessFormQaStatus: string | null
  preAssessFormUploadedAt: string | null
  sspReviewed: boolean
  boeConfirmed: boolean
  coiCleared: boolean
  teamComposed: boolean
  /** Server-computed convenience flag — true when all 8 items are satisfied. */
  allItemsComplete: boolean
}

/** PATCH body for /pre-assess — only manual items. Undefined fields are untouched. */
export interface UpdatePreAssessInput {
  contractExecutedAt?: string | null
  preAssessFormDrafted?: boolean
  preAssessFormQaStatus?: string | null
  preAssessFormUploadedAt?: string | null
}

export async function fetchPreAssess(
  engagementId: string,
  token: string,
): Promise<PreAssessChecklist> {
  return apiRequest<PreAssessChecklist>(
    `/api/c3pao/assessments/${engagementId}/pre-assess`,
    { token },
  )
}

export async function updatePreAssess(
  engagementId: string,
  input: UpdatePreAssessInput,
  token: string,
): Promise<PreAssessChecklist> {
  return apiRequest<PreAssessChecklist>(
    `/api/c3pao/assessments/${engagementId}/pre-assess`,
    {
      method: 'PATCH',
      body: input,
      token,
    },
  )
}

// ---- Customer readiness (OSC pre-assessment coordination) ----

/**
 * Per-engagement, per-item-type readiness row returned by
 * GET /api/c3pao/assessments/{id}/customer-readiness.
 *
 * Rows are sparse — missing rows default to NOT_STARTED status with no
 * customer note or C3PAO confirmation. The C3PAO side can mark items as
 * confirmed via POST /api/c3pao/assessments/{id}/customer-readiness/{itemType}/confirm.
 */
export type CustomerReadinessItemType =
  | 'FINAL_SSP'
  | 'ASSESSMENT_SCOPE_CONFIRMED'
  | 'ASSET_INVENTORY'
  | 'NETWORK_DIAGRAMS'
  | 'DATA_FLOW_DIAGRAMS'
  | 'POLICIES_PROCEDURES'
  | 'PRIOR_VALIDATIONS'
  | 'PERSONNEL_AVAILABILITY'

export interface CustomerReadinessItem {
  itemType: CustomerReadinessItemType
  status: string
  customerNote?: string | null
  evidenceUrl?: string | null
  c3paoConfirmedAt?: string | null
  lastUpdatedAt?: string | null
  lastUpdatedByType?: string | null
}

export async function fetchCustomerReadiness(
  engagementId: string,
  token: string,
): Promise<CustomerReadinessItem[]> {
  return apiRequest<CustomerReadinessItem[]>(
    `/api/c3pao/assessments/${engagementId}/customer-readiness`,
    { token },
  )
}

export async function confirmCustomerReadinessItem(
  engagementId: string,
  itemType: CustomerReadinessItemType,
  token: string,
): Promise<CustomerReadinessItem> {
  return apiRequest<CustomerReadinessItem>(
    `/api/c3pao/assessments/${engagementId}/customer-readiness/${itemType}/confirm`,
    { method: 'POST', token },
  )
}

// ---- C3PAO License (seats, concurrent assessments, cert level) ----

export interface C3PAOLicense {
  id: string
  licenseKey: string
  type: string
  status: string
  maxSeats: number
  maxAssessmentsPerYear: number
  maxConcurrentAssessments: number
  maxStandaloneInstances: number
  currentUsers: number
  currentAssessments: number
  currentInstances: number
  billingPeriod: string
  expiresAt: string | null
}

export async function fetchLicense(token: string): Promise<C3PAOLicense> {
  return apiRequest<C3PAOLicense>(`/api/c3pao/license`, { token })
}

// ---- Conflicts of Interest register (Task 10) ----

export interface COIDisclosure {
  id: string
  c3paoId: string
  assessorId: string
  assessorName: string | null
  organizationId: string
  organizationName: string | null
  disclosureType: string
  details: string | null
  disclosedAt: string
  expiresAt: string | null
  status: string
  disclosedById: string | null
}

export interface CheckCOIResult {
  hasActive: boolean
  /** "clear" | "active_conflict" | "unknown_org" */
  reason: string
  disclosures: COIDisclosure[]
}

export interface CreateCOIInput {
  assessorId: string
  organizationId: string
  disclosureType: string
  details?: string
  expiresAt?: string
}

export interface UpdateCOIInput {
  status?: string
  details?: string
}

export async function fetchCOIList(token: string): Promise<COIDisclosure[]> {
  return apiRequest<COIDisclosure[]>('/api/c3pao/coi', { token })
}

export async function createCOI(
  input: CreateCOIInput,
  token: string,
): Promise<COIDisclosure> {
  return apiRequest<COIDisclosure>('/api/c3pao/coi', {
    method: 'POST',
    body: input,
    token,
  })
}

export async function updateCOI(
  id: string,
  input: UpdateCOIInput,
  token: string,
): Promise<COIDisclosure> {
  return apiRequest<COIDisclosure>(`/api/c3pao/coi/${id}`, {
    method: 'PATCH',
    body: input,
    token,
  })
}

export async function checkCOIAssignment(
  engagementId: string,
  assessorId: string,
  token: string,
): Promise<CheckCOIResult> {
  return apiRequest<CheckCOIResult>(
    `/api/c3pao/coi/check?engagementId=${engagementId}&assessorId=${assessorId}`,
    { token },
  )
}

// ---- QA review queue (Task 11a) ----

export type QAReviewKind = 'PRE_ASSESS_FORM' | 'FINAL_REPORT'
export type QAReviewStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'NEEDS_REVISION'
  | 'REJECTED'

export interface QAReview {
  id: string
  c3paoId: string
  engagementId: string
  engagementName: string | null
  organizationName: string | null
  kind: QAReviewKind
  assignedToId: string
  assignedToName: string | null
  assignedById: string | null
  status: QAReviewStatus
  notes: string | null
  assignedAt: string
  completedAt: string | null
}

export interface CreateQAReviewInput {
  kind: QAReviewKind
  assignedToId: string
  notes?: string
}

export interface UpdateQAReviewInput {
  status?: QAReviewStatus
  notes?: string
}

export async function fetchQAReviews(
  token: string,
  mine = false,
): Promise<QAReview[]> {
  const qs = mine ? '?mine=true' : ''
  return apiRequest<QAReview[]>(`/api/c3pao/qa-reviews${qs}`, { token })
}

export async function fetchEngagementQAReviews(
  engagementId: string,
  token: string,
): Promise<QAReview[]> {
  return apiRequest<QAReview[]>(
    `/api/c3pao/assessments/${engagementId}/qa-reviews`,
    { token },
  )
}

export async function createQAReview(
  engagementId: string,
  input: CreateQAReviewInput,
  token: string,
): Promise<QAReview> {
  return apiRequest<QAReview>(
    `/api/c3pao/assessments/${engagementId}/qa-reviews`,
    {
      method: 'POST',
      body: input,
      token,
    },
  )
}

export async function updateQAReview(
  reviewId: string,
  input: UpdateQAReviewInput,
  token: string,
): Promise<QAReview> {
  return apiRequest<QAReview>(`/api/c3pao/qa-reviews/${reviewId}`, {
    method: 'PATCH',
    body: input,
    token,
  })
}

// ---- Engagement comments (Task 13a) ----

export interface EngagementCommentItem {
  id: string
  engagementId: string
  c3paoId: string
  authorId: string | null
  authorName: string | null
  content: string
  mentions: string[]
  parentId: string | null
  /**
   * 'INTERNAL' (assessor team only) or 'CUSTOMER_VISIBLE' (also visible to
   * the contractor). OSC CAP Visibility — Task 7.
   */
  visibility: 'INTERNAL' | 'CUSTOMER_VISIBLE'
  createdAt: string
  updatedAt: string
}

export interface CreateCommentInput {
  content: string
  mentions?: string[]
  parentId?: string | null
  /** OSC CAP Visibility — Task 10. Defaults to 'INTERNAL' if omitted. */
  visibility?: 'INTERNAL' | 'CUSTOMER_VISIBLE'
}

export async function fetchEngagementComments(
  engagementId: string,
  token: string,
): Promise<EngagementCommentItem[]> {
  return apiRequest<EngagementCommentItem[]>(
    `/api/c3pao/assessments/${engagementId}/comments`,
    { token },
  )
}

export async function createEngagementComment(
  engagementId: string,
  input: CreateCommentInput,
  token: string,
): Promise<EngagementCommentItem> {
  return apiRequest<EngagementCommentItem>(
    `/api/c3pao/assessments/${engagementId}/comments`,
    {
      method: 'POST',
      body: input,
      token,
    },
  )
}

// ---- In-app notifications backend wiring (Task 13b) ----
// These replace the stubs in app/actions/notifications-inapp.ts.

export interface ApiNotificationItem {
  id: string
  type: string
  engagementId: string | null
  engagementName: string | null
  actorId: string | null
  actorName: string | null
  body: string
  readAt: string | null
  createdAt: string
}

export interface ApiNotificationList {
  items: ApiNotificationItem[]
  unreadCount: number
}

export async function fetchApiNotifications(
  token: string,
): Promise<ApiNotificationList> {
  return apiRequest<ApiNotificationList>('/api/c3pao/notifications', { token })
}

export async function fetchApiUnreadCount(token: string): Promise<number> {
  const r = await apiRequest<{ count: number }>(
    '/api/c3pao/notifications/unread-count',
    { token },
  )
  return r.count
}

export async function apiMarkNotificationRead(
  id: string,
  token: string,
): Promise<void> {
  await apiRequest<unknown>(`/api/c3pao/notifications/${id}/read`, {
    method: 'PATCH',
    token,
  })
}

export async function apiMarkAllNotificationsRead(token: string): Promise<void> {
  await apiRequest<unknown>('/api/c3pao/notifications/read-all', {
    method: 'POST',
    token,
  })
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

// ---- Instance-Scoped Management (Admin via X-Instance-Key) ----

export interface InstanceOrgDetail {
  id: string
  name: string
  email: string
  phone: string | null
  website: string | null
  description: string | null
  address1: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  cageCode: string | null
  cyberAbAccreditationId: string | null
  authorizedLevels: string | null
  status: string
  pricingInfo: string | null
  typicalTimeline: string | null
  averageRating: number | null
  totalReviews: number
  maxUsers: number
  userCount: number
  engagementCount: number
}

export async function fetchInstanceOrg(): Promise<InstanceOrgDetail> {
  return apiRequest<InstanceOrgDetail>('/api/instance/org')
}

export async function fetchInstanceUsers(): Promise<C3PAOUserItem[]> {
  return apiRequest<C3PAOUserItem[]>('/api/instance/users')
}

export async function createInstanceUser(body: {
  name: string
  email: string
  password: string
  phone?: string
  jobTitle?: string
  ccaNumber?: string
  ccpNumber?: string
  isLeadAssessor: boolean
}): Promise<C3PAOUserItem> {
  return apiRequest<C3PAOUserItem>('/api/instance/users', { method: 'POST', body })
}

export async function updateInstanceUser(userId: string, body: {
  name?: string
  phone?: string
  jobTitle?: string
  ccaNumber?: string
  ccpNumber?: string
  isLeadAssessor?: boolean
  status?: string
}): Promise<unknown> {
  return apiRequest<unknown>(`/api/instance/users/${userId}`, { method: 'PUT', body })
}

export async function deleteInstanceUser(userId: string): Promise<unknown> {
  return apiRequest<unknown>(`/api/instance/users/${userId}`, { method: 'DELETE' })
}
