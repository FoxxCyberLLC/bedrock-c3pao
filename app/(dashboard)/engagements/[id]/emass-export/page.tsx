import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'

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

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href={`/engagements/${id}`}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Engagement
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <FileSpreadsheet className="h-7 w-7" />
          eMASS Export
        </h1>
        <p className="text-muted-foreground">
          Export assessment results in the official eMASS format
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Assessment Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            The eMASS export generates a CMMC Level 2 Assessment Results Form (Template v3.8)
            containing all assessment findings, objective statuses, and SSP data.
          </p>
          <p className="text-muted-foreground">
            Export data is assembled from your local assessment findings and synced engagement data.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
