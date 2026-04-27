/**
 * Tag color → Tailwind utility class map for engagement tag chips.
 *
 * Each tag color has:
 *   - chip: composite bg + text + border classes for an outline-variant Badge
 *   - dot:  solid fill color for a small color swatch dot
 */

import type { TagColor } from '@/lib/personal-views-types'

export const TAG_COLOR_CLASSES: Record<TagColor, { chip: string; dot: string }> = {
  sky: {
    chip: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
    dot: 'bg-sky-500',
  },
  violet: {
    chip: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
    dot: 'bg-violet-500',
  },
  amber: {
    chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    dot: 'bg-amber-500',
  },
  emerald: {
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    dot: 'bg-emerald-500',
  },
  rose: {
    chip: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
    dot: 'bg-rose-500',
  },
  slate: {
    chip: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-900',
    dot: 'bg-slate-500',
  },
}
