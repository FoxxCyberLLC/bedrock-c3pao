import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEMASSExportData } from '@/app/actions/cmmc-export'
import { EMASSExportWizard } from './emass-export-wizard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default async function EMASSExportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireAuth()
  if (!session) {
    redirect('/login')
  }

  const { id } = await params
  const result = await getEMASSExportData(id)

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load export data</AlertTitle>
          <AlertDescription>
            {result.error || 'An unexpected error occurred. Please try again.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <EMASSExportWizard data={result.data} user={session.c3paoUser} />
}
