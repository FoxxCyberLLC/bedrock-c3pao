'use client'

import { Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface DownloadCertificateButtonProps {
  engagementId: string
  variant?: 'outline' | 'default'
  size?: 'sm' | 'default'
  /** Show a small DRAFT badge next to the button text. Defaults to true. */
  showDraftBadge?: boolean
  /** Optional override for the button label. */
  label?: string
}

/**
 * Renders a button that links to the GET certificate route handler. The
 * route renders the @react-pdf/renderer template server-side and streams a
 * PDF download — this component is a thin link with no client-side fetch.
 */
export function DownloadCertificateButton({
  engagementId,
  variant = 'outline',
  size = 'default',
  showDraftBadge = true,
  label = 'Download Certificate',
}: DownloadCertificateButtonProps): React.ReactElement {
  const href = `/api/c3pao/engagements/${engagementId}/certificate`

  return (
    <Button asChild variant={variant} size={size}>
      <a
        href={href}
        download
        aria-label={`${label} (draft PDF) for engagement ${engagementId}`}
      >
        <Download className="h-4 w-4" aria-hidden />
        <span>{label}</span>
        {showDraftBadge ? (
          <Badge
            variant="outline"
            className="ml-1 border-amber-300 bg-amber-50 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          >
            Draft
          </Badge>
        ) : null}
      </a>
    </Button>
  )
}
