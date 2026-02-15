'use client';

import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  DRAFT: { label: 'Draft', variant: 'outline' },
  ACKNOWLEDGED: { label: 'Acknowledged', variant: 'default', className: 'bg-blue-600' },
  EVIDENCE_PENDING: { label: 'Evidence Pending', variant: 'default', className: 'bg-amber-600' },
  RESOLVED: { label: 'Resolved', variant: 'default', className: 'bg-green-600' },
  CLOSED: { label: 'Closed', variant: 'secondary' },
};

export function OPAStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.DRAFT;
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
