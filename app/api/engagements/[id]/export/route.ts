import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { fetchEMassExport } from '@/lib/api-client'

interface WizardFormData {
  executiveSummary?: string
  standardsAcceptance?: string
  hashValue?: string
  hashedDataList?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Parse wizard form data from request body (optional fields)
  let wizardData: WizardFormData = {}
  try {
    wizardData = await request.json()
  } catch {
    // Body is optional — proceed with empty wizard data
  }

  try {
    const exportData = await fetchEMassExport(id, session.apiToken)

    // Merge wizard-provided editable fields into the export output
    const merged = {
      ...exportData,
      wizardFields: {
        executiveSummary: wizardData.executiveSummary || null,
        standardsAcceptance: wizardData.standardsAcceptance || null,
        hashValue: wizardData.hashValue || null,
        hashedDataList: wizardData.hashedDataList || null,
      },
    }

    const json = JSON.stringify(merged, null, 2)
    const safeId = id.replace(/[^a-zA-Z0-9-]/g, '')
    const filename = `CMMC_Assessment_Export_${safeId}.json`

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
