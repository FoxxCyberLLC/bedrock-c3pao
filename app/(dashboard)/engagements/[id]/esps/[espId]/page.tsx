import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { getESPDetailForEngagement } from '@/app/actions/c3pao-esp'
import { C3PAOESPDetailView } from '@/components/c3pao/c3pao-esp-detail-view'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default async function C3PAOESPDetailPage({
  params,
}: {
  params: Promise<{ id: string; espId: string }>
}) {
  const session = await requireAuth()
  if (!session) {
    redirect('/login')
  }

  const { id, espId } = await params
  const result = await getESPDetailForEngagement(id, espId)

  if (!result.success || !result.data) {
    // Genuine 404 (ESP not in this engagement's package, or cross-org access) →
    // Next.js not-found. Any other failure (Go API outage, auth expired, etc.)
    // surfaces to the assessor so they can act on it.
    if (result.error?.toLowerCase().includes('not found')) {
      notFound()
    }
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Button variant="ghost" asChild>
          <Link href={`/engagements/${id}/esps`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to ESPs
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Could not load ESP</AlertTitle>
          <AlertDescription>
            {result.error ?? 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <C3PAOESPDetailView esp={result.data} engagementId={id} />
}
