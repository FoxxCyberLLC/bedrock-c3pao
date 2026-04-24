'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { AlertTriangle, Calendar, ShieldAlert, ShieldCheck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  classifyCertificates,
  daysUntil,
} from '@/lib/certificates/classify'
import type { PortfolioListItem } from '@/lib/api-client'
import { DownloadCertificateButton } from '@/components/c3pao/certificates/download-certificate-button'

interface CertificateTrackerProps {
  items: PortfolioListItem[]
}

export function CertificateTracker({ items }: CertificateTrackerProps) {
  const now = new Date()
  const buckets = classifyCertificates(items, now)

  return (
    <div className="space-y-6">
      {/* Cross-C3PAO closeout info banner */}
      <Card className="border-sky-200 bg-sky-50/40 dark:border-sky-900 dark:bg-sky-950/20">
        <CardContent className="flex items-start gap-3 py-4 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
          <div>
            <p className="font-medium text-sky-900 dark:text-sky-100">
              Cross-C3PAO POA&amp;M closeout
            </p>
            <p className="text-xs text-sky-800 dark:text-sky-300">
              Per CAP v2.0 Phase 4, either the same or a different C3PAO may
              perform the POA&amp;M closeout. Engagements are tenant-scoped in
              this platform, so to close out another C3PAO&apos;s Conditional
              engagement, the receiving C3PAO must create a new engagement
              from the OSC. Cross-tenant closeout import is a future feature.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Final certificates */}
      <CertSection
        title="Final Level 2"
        description={`${buckets.final.length} active · sorted by soonest expiry`}
        icon={ShieldCheck}
        iconClass="text-emerald-600"
        items={buckets.final}
        dateColumn="certExpiresAt"
        dateLabel="Expires"
        now={now}
        showDownload
      />

      {/* Conditional certificates */}
      <CertSection
        title="Conditional Level 2"
        description={`${buckets.conditional.length} active · POA&M must close out within 180 days`}
        icon={ShieldAlert}
        iconClass="text-amber-600"
        items={buckets.conditional}
        dateColumn="poamCloseoutDue"
        dateLabel="POA&M closeout"
        now={now}
        showDownload
      />

      {/* Expired / No Status */}
      <CertSection
        title="Expired / No Status"
        description={`${buckets.expired.length} engagements · historical record`}
        icon={AlertTriangle}
        iconClass="text-muted-foreground"
        items={buckets.expired}
        dateColumn="certExpiresAt"
        dateLabel="Expired"
        now={now}
        mutedRows
      />
    </div>
  )
}

interface CertSectionProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  iconClass: string
  items: PortfolioListItem[]
  dateColumn: 'certExpiresAt' | 'poamCloseoutDue'
  dateLabel: string
  now: Date
  mutedRows?: boolean
  showDownload?: boolean
}

function CertSection({
  title,
  description,
  icon: Icon,
  iconClass,
  items,
  dateColumn,
  dateLabel,
  now,
  mutedRows = false,
  showDownload = false,
}: CertSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={cn('h-4 w-4', iconClass)} aria-hidden />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            No engagements in this bucket.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>{dateLabel}</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Signed By</TableHead>
                {showDownload ? <TableHead className="text-right">Certificate</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const target = item[dateColumn]
                const days = daysUntil(target, now)
                const urgent = days !== null && days >= 0 && days <= 30
                return (
                  <TableRow
                    key={item.id}
                    className={cn(mutedRows && 'text-muted-foreground')}
                  >
                    <TableCell>
                      <Link
                        href={`/engagements/${item.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {item.organizationName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{item.packageName}</TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {item.updatedAt
                        ? format(new Date(item.updatedAt), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      <span className="flex items-center gap-1">
                        <Calendar
                          className="h-3 w-3 text-muted-foreground"
                          aria-hidden
                        />
                        {target
                          ? format(new Date(target), 'MMM d, yyyy')
                          : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {days === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs tabular-nums',
                            days < 0
                              ? 'bg-muted text-muted-foreground'
                              : urgent
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                                : '',
                          )}
                        >
                          {days < 0
                            ? `${-days}d ago`
                            : days === 0
                              ? 'Today'
                              : `${days}d`}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {/* certSignedByName not on PortfolioListItem; engagement detail
                          shows the full ACO from the /phase endpoint */}
                      —
                    </TableCell>
                    {showDownload ? (
                      <TableCell className="text-right">
                        <DownloadCertificateButton
                          engagementId={item.id}
                          size="sm"
                          variant="outline"
                          label="PDF"
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
