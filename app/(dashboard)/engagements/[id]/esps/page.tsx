import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Cloud, CheckCircle2, XCircle } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { getESPsByEngagement } from '@/app/actions/c3pao-esp'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-600',
  INACTIVE: 'bg-gray-500',
  UNDER_REVIEW: 'bg-amber-600',
  TERMINATED: 'bg-red-600',
}

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
  const { redirectIfOutsideEngagement } = await import('@/lib/engagement/redirect-if-outside')
  await redirectIfOutsideEngagement(id)
  const result = await getESPsByEngagement(id)
  const esps = result.data ?? []

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
          Review the OSC&apos;s external service providers and their compliance
          documentation.
        </p>
      </div>

      {result.success === false && (
        <Card>
          <CardContent className="py-6 text-center text-destructive">
            <p>Failed to load ESPs: {result.error}</p>
          </CardContent>
        </Card>
      )}

      {result.success && esps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Cloud className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              No external service providers registered for this engagement.
            </p>
          </CardContent>
        </Card>
      ) : result.success ? (
        <Card>
          <CardHeader>
            <CardTitle>Provider Inventory</CardTitle>
            <CardDescription>
              {esps.length} provider{esps.length !== 1 ? 's' : ''} registered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CUI Handling</TableHead>
                  <TableHead>Certifications</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {esps.map((esp) => (
                  <TableRow key={esp.id}>
                    <TableCell>
                      <Link
                        href={`/engagements/${id}/esps/${esp.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {esp.providerName}
                      </Link>
                      {esp.primaryContact && (
                        <p className="text-xs text-muted-foreground">
                          {esp.primaryContact}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {esp.providerType.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="default"
                        className={statusColors[esp.status]}
                      >
                        {esp.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs space-y-0.5">
                      <CUIRow label="Stores" on={esp.storesCui} />
                      <CUIRow label="Processes" on={esp.processesCui} />
                      <CUIRow label="Transmits" on={esp.transmitsCui} />
                    </TableCell>
                    <TableCell className="text-xs space-y-0.5">
                      <CUIRow label="FedRAMP" on={esp.fedRampCertified} />
                      <CUIRow label="CMMC" on={esp.cmmcCertified} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function CUIRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {on ? (
        <CheckCircle2 className="h-3 w-3 text-green-600" />
      ) : (
        <XCircle className="h-3 w-3 text-muted-foreground" />
      )}
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}
