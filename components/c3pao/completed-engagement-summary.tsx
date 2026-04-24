'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Download, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  CMMCStatusConfig,
  normalizeLegacyStatus,
} from '@/lib/cmmc/status-determination'
import { DownloadCertificateButton } from '@/components/c3pao/certificates/download-certificate-button'

interface CompletedEngagementSummaryProps {
  engagement: {
    id: string
    status: string
    assessmentResult?: string | null
  }
}

/**
 * Read-only summary view for COMPLETED engagements.
 *
 * Rendered when `getEngagementById` returns the minimal payload for terminal
 * engagements ({id, status, assessmentResult} only). Avoids the field-access
 * crashes that occur when the full EngagementDetail tries to render with
 * missing targetLevel / atoPackage / dates.
 *
 * Legacy result enums (PASSED / CONDITIONAL / FAILED) are normalized to the
 * modern CMMC labels via normalizeLegacyStatus.
 */
export function CompletedEngagementSummary({ engagement }: CompletedEngagementSummaryProps) {
  const cmmcStatus = normalizeLegacyStatus(engagement.assessmentResult ?? null)

  const Icon = cmmcStatus === 'FINAL_LEVEL_2'
    ? CheckCircle2
    : cmmcStatus === 'CONDITIONAL_LEVEL_2'
      ? AlertTriangle
      : cmmcStatus === 'NO_CMMC_STATUS'
        ? XCircle
        : Info

  const iconColor = cmmcStatus === 'FINAL_LEVEL_2'
    ? 'text-green-600'
    : cmmcStatus === 'CONDITIONAL_LEVEL_2'
      ? 'text-amber-600'
      : cmmcStatus === 'NO_CMMC_STATUS'
        ? 'text-red-600'
        : 'text-gray-400'

  const config = cmmcStatus ? CMMCStatusConfig[cmmcStatus] : null

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/engagements">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Engagements
        </Link>
      </Button>

      <Card className={config ? `${config.bgClass} ${config.borderClass}` : 'bg-gray-500/5 border-gray-500/20'}>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <Icon className={`h-12 w-12 shrink-0 ${iconColor}`} />
            <div>
              <h1 className={`text-2xl font-semibold ${config?.textClass ?? ''}`}>
                Assessment Complete
              </h1>
              <p className={`mt-1 text-base font-medium ${config?.textClass ?? 'text-muted-foreground'}`}>
                {config?.label ?? 'Result Not Recorded'}
              </p>
              {config?.description && (
                <p className={`mt-2 text-sm ${config.textClass}`}>{config.description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(cmmcStatus === 'FINAL_LEVEL_2' ||
              cmmcStatus === 'CONDITIONAL_LEVEL_2') && (
              <DownloadCertificateButton engagementId={engagement.id} />
            )}
            <Link href={`/engagements/${engagement.id}/emass-export`}>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export to eMASS
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
