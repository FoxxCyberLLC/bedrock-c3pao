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
  const XLSX = await import('xlsx')

  const leadAssessor = input.team.find((m) => m.role === 'LEAD')
  const qaAssessor = input.team.find((m) => m.role === 'QA' || m.role === 'ASSESSOR')

  const metCount = input.controls.filter((c) => c.status === 'MET').length
  const notMetCount = input.controls.filter((c) => c.status === 'NOT_MET').length
  const poamCount = input.controls.filter((c) => c.status === 'IN_POAM').length
  const assessedObjs = input.objectives.filter((o) => o.status !== 'NOT_ASSESSED')

  // ── Sheet 1: Assessment Results ──
  const sheet1Data: (string | number | null)[][] = [
    ['CMMC Level 2 Assessment Results', null],
    ['Template Version', '3.8'],
    [],
    ['Assessment Information', null],
    ['OSC Name', input.exportData.organization],
    ['System Name', input.exportData.systemName ?? ''],
    ['C3PAO Name', input.exportData.assessorOrganization],
    ['CMMC Level', input.exportData.cmmcLevel],
    ['Assessment Start Date', fmtDate(input.exportData.assessmentStartDate)],
    ['Assessment End Date', fmtDate(input.exportData.assessmentEndDate)],
    [],
    ['Assessor Information', null],
    ['Lead Assessor CPN', leadAssessor?.jobTitle ?? ''],
    ['QA Assessor CPN', qaAssessor?.jobTitle ?? ''],
    [],
    ['Assessment Summary', null],
    ['Total Requirements', input.controls.length],
    ['Requirements Met', metCount],
    ['Requirements Not Met', notMetCount],
    ['Requirements in POA&M', poamCount],
    ['Total Objectives', input.objectives.length],
    ['Objectives Assessed', assessedObjs.length],
    [],
    ['Hash Information', null],
    ['Hash Algorithm', 'SHA-256'],
    ['Hash Value', input.wizardFields.hashValue],
    ['Hashed Data List', input.wizardFields.hashedDataList],
    ['Hash Date', fmtDate(new Date().toISOString())],
    [],
    ['Standards Acceptance', input.wizardFields.standardsAcceptance || 'None'],
    [],
    ['C3PAO Executive Summary', null],
    [input.wizardFields.executiveSummary, null],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data)
  ws1['!cols'] = [{ wch: 28 }, { wch: 60 }]

  // ── Sheet 2: Requirements ──
  const reqRows = input.controls
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => {
      const cmmcId = getCmmcDisplayId(c.requirementId, c.familyCode)
      const rv = getRequirementValue(c.requirementId)
      const status = mapStatus(c.status)
      const inPoam = c.status === 'IN_POAM' ? 'Yes' : 'No'
      const pointsToSubtract = c.status === 'NOT_MET' ? rv.value : 0

      return {
        'Requirement Number': cmmcId,
        'Requirement Description': c.basicRequirement,
        'Level': c.cmmcLevel || 'Level 2',
        'Requirement Value': rv.displayValue,
        'POA&M Allowed': rv.poamAllowed ? 'Yes' : 'No',
        'Requirement Status': status,
        'Requirement in POA&M': inPoam,
        'Points to Subtract': pointsToSubtract,
        'Implementation Notes': c.implementationNotes ?? '',
        'Assessment Notes': c.assessmentNotes ?? '',
      }
    })
  const ws2 = XLSX.utils.json_to_sheet(reqRows)
  ws2['!cols'] = [
    { wch: 18 }, { wch: 55 }, { wch: 10 }, { wch: 8 }, { wch: 12 },
    { wch: 15 }, { wch: 14 }, { wch: 10 }, { wch: 30 }, { wch: 30 },
  ]

  // ── Sheet 3: Objectives ──
  const objRows = input.objectives
    .sort((a, b) => a.objectiveReference.localeCompare(b.objectiveReference))
    .map((o) => {
      const cmmcReqId = getCmmcDisplayId(o.requirementId, o.familyCode)
      const finding = findFinding(o.requirementId, input.exportData.findings)

      return {
        'Requirement Number': cmmcReqId,
        'Objective Reference': o.objectiveReference,
        'Description': o.description,
        'Artifacts Reviewed': o.artifactsReviewed ?? '',
        'Interviews': o.interviewees ?? '',
        'Examine': o.examineDescription ?? '',
        'Test': o.testDescription ?? '',
        'Overall Comments': o.assessmentNotes ?? '',
        'Time to Assess (min)': o.timeToAssessMinutes ?? '',
        'Inherited Status': o.inheritedStatus ?? '',
        'Score': mapStatus(o.status),
        'Date Assessed': fmtDate(o.assessedAt),
        'Assessed By': o.assessedBy ?? '',
        'Findings': finding?.finding ?? '',
      }
    })
  const ws3 = XLSX.utils.json_to_sheet(objRows)
  ws3['!cols'] = [
    { wch: 18 }, { wch: 22 }, { wch: 50 }, { wch: 30 }, { wch: 25 },
    { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 12 },
    { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 30 },
  ]

  // ── Sheet 4: OSC SSPs ──
  const sspRows = [{
    'SSP Name': input.ssp.name ?? '',
    'SSP Version': input.ssp.version,
    'SSP Date': fmtDate(input.ssp.date),
  }]
  const ws4 = XLSX.utils.json_to_sheet(sspRows)
  ws4['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 15 }]

  // ── Sheet 5: Summary ──
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
  const summaryRows = Array.from(reqMap.values())
    .sort((a, b) => a.cmmcId.localeCompare(b.cmmcId))
    .map((r) => ({
      'Requirement': r.cmmcId,
      'Status': r.status,
      'Objectives Met': r.met,
      'Objectives Not Met': r.notMet,
      'Total Objectives': r.total,
    }))
  const ws5 = XLSX.utils.json_to_sheet(summaryRows)
  ws5['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 14 }, { wch: 16 }, { wch: 15 }]

  // ── Assemble workbook ──
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws1, 'Assessment Results')
  XLSX.utils.book_append_sheet(wb, ws2, 'Requirements')
  XLSX.utils.book_append_sheet(wb, ws3, 'Objectives')
  XLSX.utils.book_append_sheet(wb, ws4, 'OSC SSPs')
  XLSX.utils.book_append_sheet(wb, ws5, 'Summary')

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}
