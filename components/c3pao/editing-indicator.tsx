'use client'

import { Lock } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDistanceToNow } from 'date-fns'

interface EditingIndicatorProps {
  userName: string
  since: Date
  className?: string
}

export function EditingIndicator({ userName, since, className = '' }: EditingIndicatorProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 text-xs text-amber-600 ${className}`}>
            <Lock className="h-3 w-3" />
            <span className="max-w-[100px] truncate">{userName}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Being edited by {userName}</p>
          <p className="text-xs text-muted-foreground">
            Started {formatDistanceToNow(new Date(since), { addSuffix: true })}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
