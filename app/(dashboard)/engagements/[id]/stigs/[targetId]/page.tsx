import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEngagementById } from '@/app/actions/engagements'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Server, Eye } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Link from 'next/link'

interface PageProps {
  params: Promise<{
    id: string
    targetId: string
  }>
}

export default async function STIGTargetPage({ params }: PageProps) {
  const { id: engagementId, targetId } = await params

  const session = await requireAuth()
  if (!session) redirect('/login')

  const engResult = await getEngagementById(engagementId)
  if (!engResult.success || !engResult.data) {
    redirect('/engagements')
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href={`/engagements/${engagementId}/stigs`}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to STIG Checklists
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
            <Server className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">STIG Target: {targetId}</h1>
            <p className="text-muted-foreground">{engResult.data.packageName}</p>
          </div>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          Read Only
        </Badge>
      </div>

      <Alert>
        <Eye className="h-4 w-4" />
        <AlertTitle>Assessor View</AlertTitle>
        <AlertDescription>
          You are reviewing STIG scan results. STIG target details are loaded from the SaaS platform
          and displayed in read-only mode.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Target Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            STIG target details are synced from the SaaS platform. Full target data with rules
            and compliance statistics will be available once the data is cached.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
