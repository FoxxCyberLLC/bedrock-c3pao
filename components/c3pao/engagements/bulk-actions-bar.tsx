'use client'

import { Loader2, UserPlus, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface BulkActionsBarProps {
  selectedCount: number
  bulkLeadId: string
  onBulkLeadIdChange: (id: string) => void
  leadOptions: ReadonlyArray<readonly [string, string]>
  onAssign: () => void
  onClear: () => void
  isPending: boolean
}

export function BulkActionsBar({
  selectedCount,
  bulkLeadId,
  onBulkLeadIdChange,
  leadOptions,
  onAssign,
  onClear,
  isPending,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="flex flex-wrap items-center gap-3 py-3">
        <Badge variant="default">{selectedCount} selected</Badge>
        <div className="flex items-center gap-2">
          <Select value={bulkLeadId} onValueChange={onBulkLeadIdChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Re-assign lead to..." />
            </SelectTrigger>
            <SelectContent>
              {leadOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={onAssign}
            disabled={!bulkLeadId || isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Re-assign
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="ml-auto"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </CardContent>
    </Card>
  )
}
