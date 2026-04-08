'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { safeDate } from '@/lib/utils'
import { updateCOIDisclosure } from '@/app/actions/c3pao-coi'
import type { COIDisclosure } from '@/lib/api-client'

interface COIRegisterTableProps {
  initialDisclosures: COIDisclosure[]
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  ACTIVE:
    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
  EXPIRED:
    'bg-muted text-muted-foreground border-border',
  RESOLVED:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
}

export function COIRegisterTable({ initialDisclosures }: COIRegisterTableProps) {
  const [disclosures, setDisclosures] = useState<COIDisclosure[]>(initialDisclosures)
  const [isPending, startTransition] = useTransition()

  const handleResolve = (id: string) => {
    startTransition(async () => {
      const result = await updateCOIDisclosure(id, { status: 'RESOLVED' })
      if (result.success && result.data) {
        setDisclosures((prev) =>
          prev.map((d) => (d.id === id ? result.data! : d)),
        )
        toast.success('Disclosure marked as resolved')
      } else {
        toast.error(result.error ?? 'Failed to update disclosure')
      }
    })
  }

  if (disclosures.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No COI disclosures recorded. The register stays empty until a lead
        records a disclosure for an assessor + organization pair.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Assessor</TableHead>
          <TableHead>Organization</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Disclosed</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {disclosures.map((d) => {
          const disclosed = safeDate(d.disclosedAt)
          const expires = safeDate(d.expiresAt)
          return (
            <TableRow key={d.id}>
              <TableCell className="font-medium">
                {d.assessorName ?? d.assessorId}
              </TableCell>
              <TableCell>{d.organizationName ?? d.organizationId}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {d.disclosureType}
                </Badge>
              </TableCell>
              <TableCell className="text-xs tabular-nums text-muted-foreground">
                {disclosed ? format(disclosed, 'MMM d, yyyy') : '—'}
              </TableCell>
              <TableCell className="text-xs tabular-nums text-muted-foreground">
                {expires ? format(expires, 'MMM d, yyyy') : 'No expiry'}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={STATUS_BADGE_CLASS[d.status] ?? ''}
                >
                  {d.status}
                </Badge>
              </TableCell>
              <TableCell>
                {d.status === 'ACTIVE' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleResolve(d.id)}
                  >
                    Resolve
                  </Button>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
