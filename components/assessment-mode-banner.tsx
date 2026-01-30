'use client'

import { formatDistanceToNow } from 'date-fns'
import { Shield, Lock, Info } from 'lucide-react'
import Link from 'next/link'

interface AssessmentModeBannerProps {
  packageId: string
  packageName: string
  c3paoName: string
  assessorName?: string
  startedAt: Date
}

export function AssessmentModeBanner({
  packageId,
  packageName,
  c3paoName,
  assessorName,
  startedAt,
}: AssessmentModeBannerProps) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-full bg-amber-500/20">
              <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-amber-900 dark:text-amber-100">
                  Assessment in Progress
                </span>
              </div>
              <span className="text-sm text-amber-700 dark:text-amber-300">
                Your package &ldquo;{packageName}&rdquo; is being assessed by{' '}
                <span className="font-medium">{c3paoName}</span>
                {assessorName && (
                  <span className="text-amber-600 dark:text-amber-400">
                    {' '}({assessorName})
                  </span>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-amber-600 dark:text-amber-400 hidden md:block">
              Started {formatDistanceToNow(startedAt, { addSuffix: true })}
            </span>
            <Link
              href={`/cmmc/packages/${packageId}`}
              className="text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline underline-offset-2 flex items-center gap-1"
            >
              <Info className="h-3 w-3" />
              <span className="hidden sm:inline">View Package</span>
            </Link>
          </div>
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 md:mt-1 ml-9 sm:ml-10">
          Changes are temporarily disabled. Contact your assessor if you need to provide additional documentation.
        </p>
      </div>
    </div>
  )
}
