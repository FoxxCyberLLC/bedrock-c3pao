'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { SortKey, SortState } from '@/lib/engagements-list/sort'
import { SortableColumnHeader } from './sortable-column-header'

interface EngagementsTableHeaderProps {
  sort: SortState
  onSort: (key: SortKey) => void
  selectAllState: boolean | 'indeterminate'
  onSelectAll: () => void
}

const COLUMNS: ReadonlyArray<{ label: string; key: SortKey }> = [
  { label: 'Engagement', key: 'organization' },
  { label: 'Lifecycle', key: 'phase' },
  { label: 'Lead', key: 'lead' },
  { label: 'Schedule', key: 'schedule' },
  { label: 'Activity', key: 'updated' },
  { label: 'Package', key: 'risk' },
]

export function EngagementsTableHeader({
  sort,
  onSort,
  selectAllState,
  onSelectAll,
}: EngagementsTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-10">
          <Checkbox
            checked={selectAllState}
            onCheckedChange={onSelectAll}
            aria-label="Select all visible engagements"
          />
        </TableHead>
        {COLUMNS.map((col) => (
          <TableHead key={col.key}>
            <SortableColumnHeader
              label={col.label}
              sortKey={col.key}
              state={sort}
              onSort={onSort}
            />
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  )
}
