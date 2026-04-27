'use client'

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Layers } from 'lucide-react'
import { CMMC_FAMILIES } from '@/lib/cmmc/families'
import { setMemberDomains } from '@/app/actions/c3pao-team-assignment'

interface DomainAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  engagementId: string
  assessorId: string
  assessorName: string
  initialDomains: string[]
  onSuccess: () => void
}

function sortedKey(arr: string[]): string {
  return [...arr].sort().join(',')
}

export function DomainAssignmentDialog({
  open,
  onOpenChange,
  engagementId,
  assessorId,
  assessorName,
  initialDomains,
  onSuccess,
}: DomainAssignmentDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialDomains),
  )
  const [saving, setSaving] = useState(false)

  const initialKey = useMemo(() => sortedKey(initialDomains), [initialDomains])
  const currentKey = useMemo(
    () => sortedKey(Array.from(selected)),
    [selected],
  )
  const dirty = initialKey !== currentKey

  function toggleFamily(code: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    const familyCodes = Array.from(selected)
    const result = await setMemberDomains(engagementId, assessorId, familyCodes)
    setSaving(false)
    if (result.success) {
      toast.success(`Domains updated for ${assessorName}`)
      onSuccess()
      onOpenChange(false)
    } else {
      toast.error(result.error || 'Failed to update domains')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Edit Domains
          </DialogTitle>
          <DialogDescription>
            Assign CMMC control families to <strong>{assessorName}</strong>.
            They will be the responsible reviewer for the selected domains on
            this engagement.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <div className="flex flex-wrap gap-2">
            {CMMC_FAMILIES.map((family) => {
              const isSelected = selected.has(family.code)
              return (
                <button
                  type="button"
                  key={family.code}
                  onClick={() => toggleFamily(family.code)}
                  aria-pressed={isSelected}
                  title={family.name}
                  className={
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
                    (isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border')
                  }
                >
                  <span className="font-semibold tabular-nums">
                    {family.code}
                  </span>
                  <span className="opacity-80">{family.name}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {selected.size} of {CMMC_FAMILIES.length} families selected
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !dirty}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
