import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEngagementStigs, getEngagementById } from '@/app/actions/engagements'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, FileJson, Eye } from 'lucide-react'
import Link from 'next/link'

export default async function STIGsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireAuth()
  if (!session) redirect('/login')

  const { id } = await params
  const [engResult, stigsResult] = await Promise.all([
    getEngagementById(id),
    getEngagementStigs(id),
  ])

  if (!engResult.success || !engResult.data) {
    redirect('/engagements')
  }

  const stigs = stigsResult.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href={`/engagements/${id}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Engagement
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">STIG Checklists</h1>
          <p className="text-muted-foreground">
            Review STIG scan results for {engResult.data.packageName}
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          Read Only
        </Badge>
      </div>

      {stigs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileJson className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No STIG Data</h3>
            <p className="text-muted-foreground">
              The OSC has not uploaded any STIG scan results yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stigs.map((stig) => (
            <Card key={stig.id}>
              <CardHeader>
                <CardTitle>{stig.benchmarkTitle}</CardTitle>
                <CardDescription>Target: {stig.targetName}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/engagements/${id}/stigs/${stig.targetId}`}
                  className="text-primary hover:underline"
                >
                  View Details
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
