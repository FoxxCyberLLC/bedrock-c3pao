import ExcelJS from 'exceljs'
import type { ControlView, ObjectiveView, EMassExportData, EMassExportFinding, TeamMember } from '@/lib/api-client'
import { getCmmcDisplayId, getRequirementValue } from '@/lib/cmmc/requirement-values'
import { format } from 'date-fns'

export interface EMASSWorkbookInput {
  controls: ControlView[]
  objectives: ObjectiveView[]
  exportData: EMassExportData
  team: TeamMember[]
  ssp: { name: string | null; version: string; date: string | null }
  wizardFields: {
    executiveSummary: string
    standardsAcceptance: string
    hashValue: string
    hashedDataList: string
  }
}

/**
 * Sanitize a string value before writing to an Excel cell.
 * Strips leading formula-injection trigger characters (OWASP: CSV/Excel Injection).
 * ExcelJS stores strings as shared strings (t="s"), but defense-in-depth ensures
 * older or misconfigured Excel clients cannot evaluate injected formulas.
 */
function sanitizeForExcel(value: string | null | undefined): string {
  const str = value ?? ''
  // OWASP: prefix with single quote to prevent formula evaluation in Excel
  if (/^[=+\-@\t\r]/.test(str)) return "'" + str
  return str
}

function fmtDate(date: string | null | undefined): string {
  if (!date) return ''
  try {
    return format(new Date(date), 'dd-MMM-yyyy')
  } catch {
    return ''
  }
}

function mapStatus(status: string | null): string {
  switch (status) {
    case 'MET': return 'Met'
    case 'NOT_MET': return 'Not Met'
    case 'IN_POAM': return 'In POA&M'
    case 'NOT_ASSESSED': return 'Not Assessed'
    default: return status || 'Not Assessed'
  }
}

function findFinding(reqId: string, findings: EMassExportFinding[]): EMassExportFinding | null {
  return findings.find((f) => f.controlId === reqId) ?? null
}

export async function buildEMASSWorkbook(input: EMASSWorkbookInput): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()

  const leadAssessor = input.team.find((m) => m.role === 'LEAD')
  const qaAssessor = input.team.find((m) => m.role === 'QA' || m.role === 'ASSESSOR')

  const metCount = input.controls.filter((c) => c.status === 'MET').length
  const notMetCount = input.controls.filter((c) => c.status === 'NOT_MET').length
  const poamCount = input.controls.filter((c) => c.status === 'IN_POAM').length
  const assessedObjs = input.objectives.filter((o) => o.status !== 'NOT_ASSESSED')

  // ── Sheet 1: Assessment Results ──
  const ws1 = workbook.addWorksheet('Assessment Results')
  ws1.columns = [{ width: 28 }, { width: 60 }]
  ws1.addRow(['CMMC Level 2 Assessment Results'])
  ws1.addRow(['Template Version', '3.8'])
  ws1.addRow([])
  ws1.addRow(['Assessment Information'])
  ws1.addRow(['OSC Name', sanitizeForExcel(input.exportData.organization)])
  ws1.addRow(['System Name', sanitizeForExcel(input.exportData.systemName)])
  ws1.addRow(['C3PAO Name', sanitizeForExcel(input.exportData.assessorOrganization)])
  ws1.addRow(['CMMC Level', input.exportData.cmmcLevel])
  ws1.addRow(['Assessment Start Date', fmtDate(input.exportData.assessmentStartDate)])
  ws1.addRow(['Assessment End Date', fmtDate(input.exportData.assessmentEndDate)])
  ws1.addRow([])
  ws1.addRow(['Assessor Information'])
  ws1.addRow(['Lead Assessor CPN', sanitizeForExcel(leadAssessor?.jobTitle)])
  ws1.addRow(['QA Assessor CPN', sanitizeForExcel(qaAssessor?.jobTitle)])
  ws1.addRow([])
  ws1.addRow(['Assessment Summary'])
  ws1.addRow(['Total Requirements', input.controls.length])
  ws1.addRow(['Requirements Met', metCount])
  ws1.addRow(['Requirements Not Met', notMetCount])
  ws1.addRow(['Requirements in POA&M', poamCount])
  ws1.addRow(['Total Objectives', input.objectives.length])
  ws1.addRow(['Objectives Assessed', assessedObjs.length])
  ws1.addRow([])
  ws1.addRow(['Hash Information'])
  ws1.addRow(['Hash Algorithm', 'SHA-256'])
  ws1.addRow(['Hash Value', sanitizeForExcel(input.wizardFields.hashValue)])
  ws1.addRow(['Hashed Data List', sanitizeForExcel(input.wizardFields.hashedDataList)])
  ws1.addRow(['Hash Date', fmtDate(new Date().toISOString())])
  ws1.addRow([])
  ws1.addRow(['Standards Acceptance', sanitizeForExcel(input.wizardFields.standardsAcceptance) || 'None'])
  ws1.addRow([])
  ws1.addRow(['C3PAO Executive Summary'])
  ws1.addRow([sanitizeForExcel(input.wizardFields.executiveSummary)])

  // ── Sheet 2: Requirements ──
  const ws2 = workbook.addWorksheet('Requirements')
  ws2.columns = [
    { header: 'Requirement Number', key: 'requirementNumber', width: 18 },
    { header: 'Requirement Description', key: 'description', width: 55 },
    { header: 'Level', key: 'level', width: 10 },
    { header: 'Requirement Value', key: 'requirementValue', width: 8 },
    { header: 'POA&M Allowed', key: 'poamAllowed', width: 12 },
    { header: 'Requirement Status', key: 'requirementStatus', width: 15 },
    { header: 'Requirement in POA&M', key: 'inPoam', width: 14 },
    { header: 'Points to Subtract', key: 'pointsToSubtract', width: 10 },
    { header: 'Implementation Notes', key: 'implementationNotes', width: 30 },
    { header: 'Assessment Notes', key: 'assessmentNotes', width: 30 },
  ]
  for (const c of input.controls.slice().sort((a, b) => a.sortOrder - b.sortOrder)) {
    const cmmcId = getCmmcDisplayId(c.requirementId, c.familyCode)
    const rv = getRequirementValue(c.requirementId)
    const status = mapStatus(c.status)
    ws2.addRow({
      requirementNumber: cmmcId,
      description: sanitizeForExcel(c.basicRequirement),
      level: c.cmmcLevel || 'Level 2',
      requirementValue: rv.displayValue,
      poamAllowed: rv.poamAllowed ? 'Yes' : 'No',
      requirementStatus: status,
      inPoam: c.status === 'IN_POAM' ? 'Yes' : 'No',
      pointsToSubtract: c.status === 'NOT_MET' ? rv.value : 0,
      implementationNotes: sanitizeForExcel(c.implementationNotes),
      assessmentNotes: sanitizeForExcel(c.assessmentNotes),
    })
  }

  // ── Sheet 3: Objectives ──
  const ws3 = workbook.addWorksheet('Objectives')
  ws3.columns = [
    { header: 'Requirement Number', key: 'requirementNumber', width: 18 },
    { header: 'Objective Reference', key: 'objectiveReference', width: 22 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Artifacts Reviewed', key: 'artifactsReviewed', width: 30 },
    { header: 'Interviews', key: 'interviews', width: 25 },
    { header: 'Examine', key: 'examine', width: 25 },
    { header: 'Test', key: 'test', width: 25 },
    { header: 'Overall Comments', key: 'overallComments', width: 30 },
    { header: 'Time to Assess (min)', key: 'timeToAssess', width: 10 },
    { header: 'Inherited Status', key: 'inheritedStatus', width: 12 },
    { header: 'Score', key: 'score', width: 12 },
    { header: 'Date Assessed', key: 'dateAssessed', width: 14 },
    { header: 'Assessed By', key: 'assessedBy', width: 18 },
    { header: 'Findings', key: 'findings', width: 30 },
  ]
  for (const o of input.objectives.slice().sort((a, b) => a.objectiveReference.localeCompare(b.objectiveReference))) {
    const cmmcReqId = getCmmcDisplayId(o.requirementId, o.familyCode)
    const finding = findFinding(o.requirementId, input.exportData.findings)
    ws3.addRow({
      requirementNumber: cmmcReqId,
      objectiveReference: o.objectiveReference,
      description: sanitizeForExcel(o.description),
      artifactsReviewed: sanitizeForExcel(o.artifactsReviewed),
      interviews: sanitizeForExcel(o.interviewees),
      examine: sanitizeForExcel(o.examineDescription),
      test: sanitizeForExcel(o.testDescription),
      overallComments: sanitizeForExcel(o.assessmentNotes),
      timeToAssess: o.timeToAssessMinutes ?? '',
      inheritedStatus: o.inheritedStatus ?? '',
      score: mapStatus(o.status),
      dateAssessed: fmtDate(o.assessedAt),
      assessedBy: sanitizeForExcel(o.assessedBy),
      findings: sanitizeForExcel(finding?.finding),
    })
  }

  // ── Sheet 4: OSC SSPs ──
  const ws4 = workbook.addWorksheet('OSC SSPs')
  ws4.columns = [
    { header: 'SSP Name', key: 'sspName', width: 40 },
    { header: 'SSP Version', key: 'sspVersion', width: 15 },
    { header: 'SSP Date', key: 'sspDate', width: 15 },
  ]
  ws4.addRow({
    sspName: sanitizeForExcel(input.ssp.name),
    sspVersion: sanitizeForExcel(input.ssp.version),
    sspDate: fmtDate(input.ssp.date),
  })

  // ── Sheet 5: Summary ──
  const ws5 = workbook.addWorksheet('Summary')
  ws5.columns = [
    { header: 'Requirement', key: 'requirement', width: 18 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Objectives Met', key: 'objectivesMet', width: 14 },
    { header: 'Objectives Not Met', key: 'objectivesNotMet', width: 16 },
    { header: 'Total Objectives', key: 'totalObjectives', width: 15 },
  ]
  const reqMap = new Map<string, { cmmcId: string; status: string; met: number; notMet: number; total: number }>()
  for (const c of input.controls) {
    const cmmcId = getCmmcDisplayId(c.requirementId, c.familyCode)
    reqMap.set(c.requirementId, { cmmcId, status: mapStatus(c.status), met: 0, notMet: 0, total: 0 })
  }
  for (const o of input.objectives) {
    const entry = reqMap.get(o.requirementId)
    if (entry) {
      entry.total++
      if (o.status === 'MET') entry.met++
      else if (o.status === 'NOT_MET') entry.notMet++
    }
  }
  for (const r of Array.from(reqMap.values()).sort((a, b) => a.cmmcId.localeCompare(b.cmmcId))) {
    ws5.addRow({
      requirement: r.cmmcId,
      status: r.status,
      objectivesMet: r.met,
      objectivesNotMet: r.notMet,
      totalObjectives: r.total,
    })
  }

  // ── Export ──
  // ExcelJS's type declares Buffer extends ArrayBuffer, but at runtime it returns
  // a Node.js Buffer (Uint8Array subclass). Copy into a fresh standalone ArrayBuffer.
  const raw = await workbook.xlsx.writeBuffer()
  return new Uint8Array(raw as unknown as Uint8Array).buffer
}
