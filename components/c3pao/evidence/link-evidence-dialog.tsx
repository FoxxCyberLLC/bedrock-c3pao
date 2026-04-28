'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import type { LinkedObjective } from './objectives-assessment-sidebar'

interface LinkEvidenceDialogProps {
  open: boolean
  onOpenChange: (next: boolean) => void
  allObjectives: ReadonlyArray<LinkedObjective>
  alreadyLinkedIds: ReadonlyArray<string>
  onConfirm: (pickedIds: ReadonlyArray<string>) => void
  disabled: boolean
}

/**
 * Outer wrapper holds the open/close state. The inner component is keyed on
 * `open` so a fresh instance with empty `picked` / `search` mounts every
 * time the dialog opens — avoids the cascading-renders pattern of resetting
 * via useEffect.
 */
export function LinkEvidenceDialog(props: LinkEvidenceDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <LinkEvidenceDialogContent {...props} />}
    </Dialog>
  )
}

function LinkEvidenceDialogContent({
  onOpenChange,
  allObjectives,
  alreadyLinkedIds,
  onConfirm,
  disabled,
}: LinkEvidenceDialogProps) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allObjectives.filter((o) => {
      if (alreadyLinkedIds.includes(o.id)) return false
      if (!q) return true
      return (
        o.reference.toLowerCase().includes(q) ||
        (o.description ?? '').toLowerCase().includes(q)
      )
    })
  }, [allObjectives, alreadyLinkedIds, search])

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Link evidence to objectives</DialogTitle>
          <DialogDescription>
            Pick one or more assessment objectives this evidence supports.
            Already-linked objectives are hidden.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by AC.L2-3.1.1.a or description..."
            className="pl-9"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-md border">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No matching objectives.
            </p>
          ) : (
            <ul className="divide-y">
              {filtered.map((obj) => {
                const checked = picked.has(obj.id)
                return (
                  <li
                    key={obj.id}
                    className="flex items-start gap-3 px-3 py-2"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(obj.id)}
                      aria-label={`Select ${obj.reference}`}
                      className="mt-0.5"
                      disabled={disabled}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium">
                          {obj.reference}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {obj.status.replace('_', ' ').toLowerCase()}
                        </Badge>
                      </div>
                      {obj.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {obj.description}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={disabled}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(Array.from(picked))}
            disabled={picked.size === 0 || disabled}
          >
            Link {picked.size > 0 && `(${picked.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </>
  )
}
