import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Cloud } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { getESPsByEngagement } from '@/app/actions/c3pao-esp'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function C3PAOESPsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireAuth()
  if (!session) {
    redirect('/login')
  }

  const { id } = await params
  const result = await getESPsByEngagement(id)

  const esps = result.data || []

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button variant="ghost" asChild>
        <Link href={`/engagements/${id}`}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Engagement
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold">External Service Providers</h1>
        <p className="text-muted-foreground">
          Review the OSC&apos;s external service providers and their compliance documentation.
        </p>
      </div>

      {esps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Cloud className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No external service providers registered for this engagement.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Provider Inventory</CardTitle>
            <CardDescription>{esps.length} provider{esps.length !== 1 ? 's' : ''} registered</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">ESP data will be displayed here when available via the Go API.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
