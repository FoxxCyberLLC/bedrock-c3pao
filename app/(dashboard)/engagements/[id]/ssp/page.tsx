import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  BookOpen,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { requireAuth } from '@/lib/auth'
import { getSSPBundleForC3PAO } from '@/app/actions/engagements'
import { SSPStatusBadge } from '@/components/ssp/SSPStatusBadge'
import { SSPLongFormReadOnly } from '@/components/c3pao/ssp-long-form-read-only'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function C3PAOSSPReviewPage({ params }: PageProps) {
  const session = await requireAuth()
  if (!session) {
    redirect('/login')
  }

  const { id: engagementId } = await params
  const { redirectIfOutsideEngagement } = await import('@/lib/engagement/redirect-if-outside')
  await redirectIfOutsideEngagement(engagementId)
  const result = await getSSPBundleForC3PAO(engagementId)

  if (!result.success || !result.data) {
    if (result.error === 'No SSP found for this package') {
      return (
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="ghost" asChild>
            <Link href={`/engagements/${engagementId}`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Engagement
            </Link>
          </Button>
          <div className="text-center py-16 space-y-4">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold">No SSP Available</h2>
            <p className="text-muted-foreground">
              The OSC has not yet created a System Security Plan for this package.
            </p>
          </div>
        </div>
      )
    }
    if (result.error === 'SSP access not available at this engagement stage') {
      return (
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="ghost" asChild>
            <Link href={`/engagements/${engagementId}`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Engagement
            </Link>
          </Button>
          <div className="text-center py-16 space-y-4">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold">SSP Access Restricted</h2>
            <p className="text-muted-foreground">
              SSP access is not available until the engagement proposal has been accepted.
            </p>
          </div>
        </div>
      )
    }
    // Show generic not available state for stub
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" asChild>
          <Link href={`/engagements/${engagementId}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Engagement
          </Link>
        </Button>
        <div className="text-center py-16 space-y-4">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold">SSP Review</h2>
          <p className="text-muted-foreground">
            {result.error || 'SSP review is not available at this time.'}
          </p>
        </div>
      </div>
    )
  }

  const { ssp, families } = result.data

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href={`/engagements/${engagementId}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Engagement
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookOpen className="h-8 w-8" />
              System Security Plan
            </h1>
            <p className="text-muted-foreground">
              {ssp.systemName || ''} — Read-Only Review
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SSPStatusBadge status={ssp.status || 'DRAFT'} />
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
              <Shield className="h-3 w-3 mr-1" />
              C3PAO Review
            </Badge>
          </div>
        </div>
      </div>

      <SSPLongFormReadOnly
        ssp={ssp}
        families={families}
        engagementId={engagementId}
      />
    </div>
  )
}
