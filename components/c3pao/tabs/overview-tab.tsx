'use client'

import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { SSPView } from '@/lib/api-client'
import { ReadOnlyField, ReadOnlyBanner } from './ssp-helpers'

interface OverviewTabProps {
  ssp: SSPView | null
  sspLoading: boolean
  engagementName?: string | null
}

const SSP_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'secondary',
  REVIEW: 'outline',
  APPROVED: 'default',
  ARCHIVED: 'secondary',
}

export function OverviewTab({ ssp, sspLoading, engagementName }: OverviewTabProps) {
  if (sspLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!ssp) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium">No SSP data available</p>
          <p className="text-sm text-muted-foreground mt-1">
            The OSC has not yet created a System Security Plan for this engagement.
          </p>
        </CardContent>
      </Card>
    )
  }

  const statusVariant = (SSP_STATUS_COLORS[ssp.status] ?? 'secondary') as
    | 'default' | 'secondary' | 'outline' | 'destructive'

  return (
    <div className="space-y-4">
      <ReadOnlyBanner />

      {/* System header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">
                {ssp.systemName || engagementName || 'Unnamed System'}
              </CardTitle>
              {ssp.systemAbbreviation && (
                <p className="text-sm text-muted-foreground mt-0.5">{ssp.systemAbbreviation}</p>
              )}
            </div>
            <Badge variant={statusVariant}>{ssp.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="System Category" value={ssp.systemCategory} />
            <ReadOnlyField label="Contract Number" value={ssp.contractNumber} />
            <ReadOnlyField label="Version" value={ssp.version} />
            <ReadOnlyField label="System Owner" value={ssp.systemOwner} />
          </div>
          {ssp.systemDescription && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">System Description</label>
              <p className="text-sm whitespace-pre-wrap">{ssp.systemDescription}</p>
            </div>
          )}
          {ssp.systemBoundary && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Authorization Boundary</label>
              <p className="text-sm whitespace-pre-wrap">{ssp.systemBoundary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SSP metadata */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Document Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="Prepared By" value={ssp.preparedByName} />
            <ReadOnlyField label="Approved By" value={ssp.approvedBy} />
            <ReadOnlyField
              label="Last Modified"
              value={ssp.lastModified ? new Date(ssp.lastModified).toLocaleDateString() : null}
            />
            <ReadOnlyField
              label="Expiration Date"
              value={ssp.expirationDate ? new Date(ssp.expirationDate).toLocaleDateString() : null}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
