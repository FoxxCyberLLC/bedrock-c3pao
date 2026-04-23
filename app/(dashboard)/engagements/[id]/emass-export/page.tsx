import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEMASSExportData } from '@/app/actions/cmmc-export'
import { listSnapshotsAction } from '@/app/actions/engagements'
import { EMASSExportWizard } from './emass-export-wizard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default async function EMASSExportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ snapshot?: string }>
}) {
  const session = await requireAuth()
  if (!session) {
    redirect('/login')
  }

  const { id } = await params
  const { snapshot: snapshotParam } = await searchParams

  // When the URL carries ?snapshot=..., the selected id is known without
  // waiting for the snapshot list, so both fetches run in parallel. When
  // no param is present we still need the list first to resolve the
  // "current" snapshot as the default.
  let snapshots: Awaited<ReturnType<typeof listSnapshotsAction>>['data'] = []
  let selectedSnapshotId: string | undefined
  let result: Awaited<ReturnType<typeof getEMASSExportData>>

  if (snapshotParam) {
    selectedSnapshotId = snapshotParam
    const [snapshotsResult, dataResult] = await Promise.all([
      listSnapshotsAction(id),
      getEMASSExportData(id, selectedSnapshotId),
    ])
    snapshots = snapshotsResult.success && snapshotsResult.data ? snapshotsResult.data : []
    result = dataResult
  } else {
    const snapshotsResult = await listSnapshotsAction(id)
    snapshots = snapshotsResult.success && snapshotsResult.data ? snapshotsResult.data : []
    const currentSnapshot = snapshots.find((s) => s.isCurrent)
    selectedSnapshotId = currentSnapshot?.id
    result = await getEMASSExportData(id, selectedSnapshotId)
  }

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

  return (
    <EMASSExportWizard
      data={result.data}
      user={session.c3paoUser}
      snapshots={snapshots}
      selectedSnapshotId={selectedSnapshotId}
    />
  )
}
