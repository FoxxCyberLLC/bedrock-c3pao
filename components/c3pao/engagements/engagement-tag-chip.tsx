'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { EngagementTag } from '@/lib/personal-views-types'
import { TAG_COLOR_CLASSES } from './tag-color-classes'

interface EngagementTagChipProps {
  tag: EngagementTag
  /** Optional X button. When provided, calling onRemove triggers it. */
  onRemove?: () => void
}

/**
 * Inline color-coded tag chip. When `onRemove` is provided, an X button is
 * rendered after the label that calls `onRemove` on click.
 */
export function EngagementTagChip({ tag, onRemove }: EngagementTagChipProps) {
  const palette = TAG_COLOR_CLASSES[tag.color]

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 rounded-full px-1.5 py-0 text-[10px] font-medium',
        palette.chip,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', palette.dot)} aria-hidden="true" />
      <span className="truncate">{tag.label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
          aria-label={`Remove tag ${tag.label}`}
        >
          <X className="h-2.5 w-2.5" aria-hidden="true" />
        </button>
      )}
    </Badge>
  )
}
