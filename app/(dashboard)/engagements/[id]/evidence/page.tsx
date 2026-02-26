import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  FileText,
  Shield,
  HardDrive,
  AlertTriangle,
  Clock,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { EvidenceTableReadOnly } from '@/components/c3pao/evidence-table-readonly'

import { requireAuth } from '@/lib/auth'
import { getEvidenceRepositoryForC3PAO } from '@/app/actions/c3pao-dashboard'
import { formatBytes, getStoragePercentage, getStorageColorClass, getStorageProgressClass } from '@/lib/utils'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function C3PAOEvidenceRepositoryPage({ params }: PageProps) {
  const { id: engagementId } = await params

  const session = await requireAuth()
  if (!session) {
    redirect('/login')
  }

  const result = await getEvidenceRepositoryForC3PAO(engagementId)

  if (!result.success || !result.data) {
    // Show empty state when API is not yet available
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="space-y-4">
          <Button variant="ghost" asChild>
            <Link href={`/engagements/${engagementId}`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Engagement
            </Link>
          </Button>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Evidence Repository</h1>
                <Badge variant="outline">Read Only</Badge>
              </div>
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Evidence Repository Not Available</h3>
            <p className="mt-2 text-muted-foreground">
              {result.error || 'The evidence repository is not available at this time.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // API returns flat EvidenceView[] array
  const evidence = Array.isArray(result.data) ? result.data : []

  const totalEvidence = evidence.length
  const expiringEvidence = evidence.filter((e: { expirationDate: string | null }) => {
    if (!e.expirationDate) return false
    const daysUntilExpiration = Math.ceil(
      (new Date(e.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    return daysUntilExpiration <= 30 && daysUntilExpiration > 0
  }).length
  const expiredEvidence = evidence.filter((e: { expirationDate: string | null }) => {
    if (!e.expirationDate) return false
    return new Date(e.expirationDate) < new Date()
  }).length

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href={`/engagements/${engagementId}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Engagement
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Evidence Repository</h1>
              <Badge variant="outline">Read Only</Badge>
            </div>
            <p className="text-muted-foreground">
              Review OSC-uploaded evidence documents
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Evidence</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvidence}</div>
            <p className="text-xs text-muted-foreground">Uploaded documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{expiringEvidence}</div>
            <p className="text-xs text-muted-foreground">Within 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredEvidence}</div>
            <p className="text-xs text-muted-foreground">Past expiration date</p>
          </CardContent>
        </Card>
      </div>

      {expiredEvidence > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Expired Evidence</AlertTitle>
          <AlertDescription>
            {expiredEvidence} evidence {expiredEvidence === 1 ? 'file has' : 'files have'} expired.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Evidence Files</CardTitle>
          <CardDescription>
            Review all evidence artifacts uploaded for this ATO package.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalEvidence === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Evidence Uploaded</h3>
              <p className="mt-2 text-muted-foreground">
                The OSC has not uploaded any evidence files for this package yet.
              </p>
            </div>
          ) : (
            <EvidenceTableReadOnly evidence={evidence} engagementId={engagementId} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
