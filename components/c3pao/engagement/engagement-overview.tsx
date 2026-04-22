'use client'

/**
 * Engagement > Overview subtab. Surfaces OSC + engagement metadata at a
 * glance and exposes the lead-only "Export audit bundle" action via a
 * plain anchor to the Next.js API route.
 */

import { format } from 'date-fns'
import { Building2, Calendar, Download, FileSignature, User } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { safeDate } from '@/lib/utils'
import type { EngagementSummary } from '@/lib/api-client'

export interface EngagementOverviewProps {
  engagement: EngagementSummary
  currentPhase?: string | null
  isLead: boolean
}

interface Field {
  label: string
  value: string | null | undefined
  icon?: React.ReactNode
}

function formatDateMaybe(value: string | null | undefined): string | null {
  if (!value) return null
  const d = safeDate(value)
  return d ? format(d, 'PPP') : value
}

function FieldList({ fields }: { fields: Field[] }): React.ReactElement {
  return (
    <dl className="space-y-3">
      {fields.map((f) => (
        <div key={f.label} className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
          <dt className="flex items-center gap-1.5 text-muted-foreground">
            {f.icon}
            {f.label}
          </dt>
          <dd className="font-medium">{f.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

export function EngagementOverview({
  engagement,
  currentPhase,
  isLead,
}: EngagementOverviewProps): React.ReactElement {
  const oscFields: Field[] = [
    {
      label: 'OSC',
      value: engagement.organizationName,
      icon: <Building2 className="h-4 w-4" aria-hidden />,
    },
    {
      label: 'Package',
      value: engagement.packageName,
      icon: <FileSignature className="h-4 w-4" aria-hidden />,
    },
    {
      label: 'Target level',
      value: engagement.targetLevel,
    },
    {
      label: 'Access level',
      value: engagement.accessLevel,
    },
    {
      label: 'Contract window',
      value: [
        formatDateMaybe(engagement.scheduledStartDate),
        formatDateMaybe(engagement.scheduledEndDate),
      ]
        .filter(Boolean)
        .join(' → '),
      icon: <Calendar className="h-4 w-4" aria-hidden />,
    },
    {
      label: 'Lead assessor',
      value: engagement.leadAssessorName,
      icon: <User className="h-4 w-4" aria-hidden />,
    },
  ]

  const metaFields: Field[] = [
    {
      label: 'Engagement ID',
      value: engagement.id,
    },
    {
      label: 'Status',
      value: engagement.status,
    },
    {
      label: 'Requested',
      value: formatDateMaybe(engagement.requestedDate),
    },
    {
      label: 'Accepted',
      value: formatDateMaybe(engagement.acceptedDate),
    },
    {
      label: 'Actual start',
      value: formatDateMaybe(engagement.actualStartDate),
    },
    {
      label: 'Actual completion',
      value: formatDateMaybe(engagement.actualCompletionDate),
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">OSC summary</CardTitle>
              <CardDescription>
                Key contractor and package identifiers.
              </CardDescription>
            </div>
            {currentPhase && (
              <Badge variant="outline" className="uppercase">
                {currentPhase.replace(/_/g, ' ')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <FieldList fields={oscFields} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engagement metadata</CardTitle>
          <CardDescription>
            Lifecycle state and the C3PAO audit-bundle export.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldList fields={metaFields} />
          {isLead && (
            <div className="border-t pt-3">
              <Button
                asChild
                variant="outline"
                size="sm"
                data-testid="export-audit-bundle-button"
              >
                <a
                  href={`/api/c3pao/engagements/${engagement.id}/export-bundle`}
                  download
                >
                  <Download className="h-4 w-4" aria-hidden /> Export audit bundle
                </a>
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Downloads a zip of readiness artifacts, audit log, notes, and
                manifest for record-keeping.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
