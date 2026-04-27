'use client'

import { AlertTriangle, EyeOff, Star, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChipTogglesProps {
  mineOnly: boolean
  atRiskOnly: boolean
  pinnedOnly: boolean
  /** Default `true` upstream — snoozed rows hidden by default. */
  hideSnoozed: boolean
  onMineOnlyChange: (next: boolean) => void
  onAtRiskOnlyChange: (next: boolean) => void
  onPinnedOnlyChange: (next: boolean) => void
  onHideSnoozedChange: (next: boolean) => void
}

interface ChipDef {
  key: 'mineOnly' | 'atRiskOnly' | 'pinnedOnly' | 'hideSnoozed'
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const CHIPS: ReadonlyArray<ChipDef> = [
  { key: 'mineOnly', label: 'Mine only', Icon: User },
  { key: 'atRiskOnly', label: 'At risk', Icon: AlertTriangle },
  { key: 'pinnedOnly', label: 'Pinned', Icon: Star },
  { key: 'hideSnoozed', label: 'Hide snoozed', Icon: EyeOff },
]

/**
 * Quick-filter toggle chip row. Each chip is a `<button>` styled as an
 * outline badge when off and a solid badge when on. Active chips show a
 * leading lucide icon.
 */
export function ChipToggles({
  mineOnly,
  atRiskOnly,
  pinnedOnly,
  hideSnoozed,
  onMineOnlyChange,
  onAtRiskOnlyChange,
  onPinnedOnlyChange,
  onHideSnoozedChange,
}: ChipTogglesProps) {
  const valueByKey: Record<ChipDef['key'], boolean> = {
    mineOnly,
    atRiskOnly,
    pinnedOnly,
    hideSnoozed,
  }

  const setterByKey: Record<ChipDef['key'], (next: boolean) => void> = {
    mineOnly: onMineOnlyChange,
    atRiskOnly: onAtRiskOnlyChange,
    pinnedOnly: onPinnedOnlyChange,
    hideSnoozed: onHideSnoozedChange,
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {CHIPS.map(({ key, label, Icon }) => {
        const on = valueByKey[key]
        return (
          <button
            key={key}
            type="button"
            onClick={() => setterByKey[key](!on)}
            aria-pressed={on}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors',
              on
                ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {on && <Icon className="h-3 w-3" aria-hidden="true" />}
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
