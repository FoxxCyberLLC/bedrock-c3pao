'use client'

import { ChevronDown, Tag as TagIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TagFilterDropdownProps {
  allLabels: string[]
  selected: string[]
  onChange: (next: string[]) => void
}

/**
 * Multi-select dropdown for filtering by tag labels. The trigger displays a
 * "Tags" label and a count when any are selected. When `allLabels` is empty,
 * the trigger is disabled with an explanatory label.
 */
export function TagFilterDropdown({
  allLabels,
  selected,
  onChange,
}: TagFilterDropdownProps) {
  const isEmpty = allLabels.length === 0
  const selectedSet = new Set(selected)

  function toggle(label: string): void {
    const next = new Set(selectedSet)
    if (next.has(label)) {
      next.delete(label)
    } else {
      next.add(label)
    }
    onChange(Array.from(next))
  }

  function clearAll(): void {
    onChange([])
  }

  if (isEmpty) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled
        className="h-7 gap-1.5 px-2.5 text-xs"
      >
        <TagIcon className="h-3 w-3" aria-hidden="true" />
        <span>No tags yet</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 px-2.5 text-xs"
        >
          <TagIcon className="h-3 w-3" aria-hidden="true" />
          <span>Tags</span>
          {selected.length > 0 && (
            <span
              className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium tabular-nums text-primary-foreground"
              aria-label={`${selected.length} selected`}
            >
              {selected.length}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between text-xs">
          <span>Filter by tags</span>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allLabels.map((label) => (
          <DropdownMenuCheckboxItem
            key={label}
            checked={selectedSet.has(label)}
            onCheckedChange={() => toggle(label)}
            onSelect={(e) => e.preventDefault()}
            className="text-xs"
          >
            {label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
