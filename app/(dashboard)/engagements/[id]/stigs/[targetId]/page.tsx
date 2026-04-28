import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Server,
  Eye,
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  CircleHelp,
} from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { getEngagementById } from '@/app/actions/engagements'
import { getSTIGTargetDetail } from '@/app/actions/stig'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface PageProps {
  params: Promise<{
    id: string
    targetId: string
  }>
}

const severityMeta: Record<
  string,
  { label: string; className: string }
> = {
  HIGH: { label: 'CAT I', className: 'bg-red-600 hover:bg-red-700' },
  MEDIUM: { label: 'CAT II', className: 'bg-orange-500 hover:bg-orange-600' },
  LOW: { label: 'CAT III', className: 'bg-yellow-500 hover:bg-yellow-600' },
}

function SeverityBadge({ severity }: { severity: string }) {
  const meta = severityMeta[severity] ?? {
    label: severity,
    className: 'bg-gray-500',
  }
  return (
    <Badge className={`${meta.className} text-white`}>
      {meta.label}
    </Badge>
  )
}

const statusMeta: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ElementType }
> = {
  OPEN: { label: 'Open', variant: 'destructive', icon: AlertTriangle },
  NOT_A_FINDING: { label: 'Not a Finding', variant: 'default', icon: CheckCircle2 },
  NOT_APPLICABLE: { label: 'Not Applicable', variant: 'secondary', icon: CircleSlash },
  NOT_REVIEWED: { label: 'Not Reviewed', variant: 'outline', icon: CircleHelp },
}

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status] ?? {
    label: status,
    variant: 'outline' as const,
    icon: CircleHelp,
  }
  const Icon = meta.icon
  return (
    <Badge variant={meta.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  )
}

export default async function STIGTargetPage({ params }: PageProps) {
  const { id: engagementId, targetId } = await params

  const session = await requireAuth()
  if (!session) redirect('/login')

  const { redirectIfOutsideEngagement } = await import('@/lib/engagement/redirect-if-outside')
  await redirectIfOutsideEngagement(engagementId)

  const engResult = await getEngagementById(engagementId)
  if (!engResult.success || !engResult.data) {
    redirect('/engagements')
  }

  const detailResult = await getSTIGTargetDetail(engagementId, targetId)
  if (!detailResult.success || !detailResult.data) {
    if (detailResult.error?.toLowerCase().includes('not found')) {
      notFound()
    }
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Button variant="ghost" asChild>
          <Link href={`/engagements/${engagementId}/stigs`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to STIGs
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Could not load STIG target</AlertTitle>
          <AlertDescription>{detailResult.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const { target, checklists, ruleSummary, rules } = detailResult.data

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button variant="ghost" asChild>
        <Link href={`/engagements/${engagementId}/stigs`}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to STIGs
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Server className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{target.hostname}</h1>
            <p className="text-muted-foreground">
              {[target.fqdn, target.ipAddress].filter(Boolean).join(' · ') || 'STIG Target'}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          Read Only
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ruleSummary.totalRules}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {ruleSummary.openCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Not a Finding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {ruleSummary.notAFindingCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Not Applicable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {ruleSummary.notApplicableCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Not Reviewed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {ruleSummary.notReviewedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {checklists.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Checklists ({checklists.length})</CardTitle>
            <CardDescription>
              STIG benchmarks imported against this target
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {checklists.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 border rounded px-3 py-2"
                >
                  <span className="font-medium">{c.displayName}</span>
                  <span className="text-muted-foreground text-xs">
                    {c.totalRules} rules
                    {c.version ? ` · v${c.version}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rules ({rules.length})</CardTitle>
          <CardDescription>
            Every rule evaluated against this target, read-only as imported by the
            OSC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No rules found for this target.
            </p>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Rule</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[110px]">Severity</TableHead>
                    <TableHead className="w-[180px]">Status</TableHead>
                    <TableHead className="w-[160px]">CCI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">
                        {r.ruleId}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{r.ruleTitle}</p>
                      </TableCell>
                      <TableCell>
                        <SeverityBadge severity={r.severity} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.ccis && r.ccis.length > 0 ? r.ccis.join(', ') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
