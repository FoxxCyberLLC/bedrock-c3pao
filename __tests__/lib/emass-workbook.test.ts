import { describe, it, expect } from 'vitest'
import { buildEMASSWorkbook } from '@/lib/emass-workbook'
import type { EMASSWorkbookInput } from '@/lib/emass-workbook'
import ExcelJS from 'exceljs'

// Minimal mock input
const mockInput: EMASSWorkbookInput = {
  controls: [
    {
      requirementId: '03.01.01',
      familyCode: 'AC',
      basicRequirement: 'Limit system access to authorized users.',
      cmmcLevel: 'Level 2',
      status: 'MET',
      sortOrder: 1,
      implementationNotes: 'Access control implemented.',
      assessmentNotes: 'Verified.',
    } as any,
    {
      requirementId: '03.01.02',
      familyCode: 'AC',
      basicRequirement: 'Limit system access to authorized transactions.',
      cmmcLevel: 'Level 2',
      status: 'NOT_MET',
      sortOrder: 2,
      implementationNotes: null,
      assessmentNotes: null,
    } as any,
  ],
  objectives: [],
  exportData: {
    organization: 'Test Org',
    systemName: 'Test System',
    assessorOrganization: 'Test C3PAO',
    cmmcLevel: 'Level 2',
    assessmentStartDate: '2026-01-01',
    assessmentEndDate: '2026-01-15',
    findings: [],
  } as any,
  team: [
    { role: 'LEAD', jobTitle: 'CCA-12345', name: 'Test Assessor' } as any,
  ],
  ssp: { name: 'Test SSP', version: '1.0', date: '2026-01-01' },
  wizardFields: {
    executiveSummary: 'Summary text.',
    standardsAcceptance: 'Accepted.',
    hashValue: 'abc123',
    hashedDataList: 'file1.xlsx',
  },
}

// Helper: load workbook from ArrayBuffer and get all string values in a sheet
async function getCellValues(buffer: ArrayBuffer, sheetName: string): Promise<string[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const ws = wb.getWorksheet(sheetName)!
  const values: string[] = []
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      if (typeof cell.value === 'string') values.push(cell.value)
    })
  })
  return values
}

describe('buildEMASSWorkbook', () => {
  it('returns an ArrayBuffer', async () => {
    const result = await buildEMASSWorkbook(mockInput)
    expect(result).toBeInstanceOf(ArrayBuffer)
    expect(result.byteLength).toBeGreaterThan(0)
  })

  it('produces a valid Excel workbook with correct sheet names', async () => {
    const result = await buildEMASSWorkbook(mockInput)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(result)

    const sheetNames = workbook.worksheets.map((ws) => ws.name)
    expect(sheetNames).toContain('Assessment Results')
    expect(sheetNames).toContain('Requirements')
    expect(sheetNames).toContain('Objectives')
    expect(sheetNames).toContain('OSC SSPs')
    expect(sheetNames).toContain('Summary')
  })

  it('Requirements sheet has expected columns', async () => {
    const result = await buildEMASSWorkbook(mockInput)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(result)

    const reqSheet = workbook.getWorksheet('Requirements')
    expect(reqSheet).toBeDefined()
    // Check header row
    const headerRow = reqSheet!.getRow(1)
    const headers = headerRow.values as string[]
    expect(headers).toContain('Requirement Number')
    expect(headers).toContain('Requirement Status')
  })

  describe('formula injection prevention (H11)', () => {
    it('sanitizes =FORMULA() in assessment notes', async () => {
      const input: EMASSWorkbookInput = {
        ...mockInput,
        controls: [
          { ...mockInput.controls[0], assessmentNotes: '=HYPERLINK("http://evil.com","click")' } as any,
        ],
      }
      const result = await buildEMASSWorkbook(input)
      const values = await getCellValues(result, 'Requirements')
      expect(values.every((v) => !v.startsWith('='))).toBe(true)
    })

    it('sanitizes +FORMULA and -FORMULA in implementation notes', async () => {
      const input: EMASSWorkbookInput = {
        ...mockInput,
        controls: [
          { ...mockInput.controls[0], implementationNotes: '+cmd|"/C calc"!A0', assessmentNotes: '-2+3+cmd|"/C calc"!A0' } as any,
        ],
      }
      const result = await buildEMASSWorkbook(input)
      const values = await getCellValues(result, 'Requirements')
      expect(values.every((v) => !v.startsWith('+'))).toBe(true)
      expect(values.every((v) => !v.startsWith('-'))).toBe(true)
    })

    it('sanitizes @formula in organization name', async () => {
      const input: EMASSWorkbookInput = {
        ...mockInput,
        exportData: { ...mockInput.exportData, organization: '@SUM(1+1)' } as any,
      }
      const result = await buildEMASSWorkbook(input)
      const values = await getCellValues(result, 'Assessment Results')
      expect(values.every((v) => !v.startsWith('@'))).toBe(true)
    })

    it('leaves safe strings unchanged', async () => {
      const input: EMASSWorkbookInput = {
        ...mockInput,
        controls: [
          { ...mockInput.controls[0], assessmentNotes: 'Normal text, no formula here.' } as any,
        ],
      }
      const result = await buildEMASSWorkbook(input)
      const values = await getCellValues(result, 'Requirements')
      expect(values).toContain('Normal text, no formula here.')
    })
  })

  it('includes the correct number of requirement rows', async () => {
    const result = await buildEMASSWorkbook(mockInput)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(result)

    const reqSheet = workbook.getWorksheet('Requirements')!
    // Row 1 = header, rows 2+ = data
    expect(reqSheet.rowCount).toBe(3) // header + 2 controls
  })
})
