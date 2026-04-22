'use client'

import Image from 'next/image'
import Link from 'next/link'
import { User, Phone, Mail, Maximize2, ImageOff } from 'lucide-react'

export function ReadOnlyField({
  label,
  value,
  className,
}: {
  label: string
  value: unknown
  className?: string
}) {
  if (!value || (typeof value === 'string' && !value.trim())) return null
  return (
    <div className={`space-y-1 ${className || ''}`}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <p className="text-sm whitespace-pre-wrap">{String(value)}</p>
    </div>
  )
}

export function ReadOnlyTextArea({
  label,
  value,
}: {
  label: string
  value: unknown
}) {
  if (!value || (typeof value === 'string' && !value.trim())) return null
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-3 border">
        {String(value)}
      </div>
    </div>
  )
}

export function ContactCard({
  title,
  name,
  email,
  phone,
}: {
  title: string
  name: string | null
  email?: string | null
  phone?: string | null
}) {
  if (!name) return null
  return (
    <div className="space-y-1.5 p-3 rounded-lg border bg-muted/30">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="flex items-center gap-1.5 text-sm">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        {name}
      </div>
      {phone && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="h-3 w-3" />
          {phone}
        </div>
      )}
      {email && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mail className="h-3 w-3" />
          {email}
        </div>
      )}
    </div>
  )
}

/**
 * Thumbnail display for an SSP diagram. When `reviewHref` is provided, the
 * thumbnail is a link to the dedicated review page instead of opening a zoom
 * dialog — assessors can leave internal review notes there per CAP v2.0.
 */
export function DiagramDisplay({
  label,
  url,
  fileName,
  reviewHref,
}: {
  label: string
  url: string | null | undefined
  fileName?: string | null
  reviewHref?: string
}) {
  if (!url) {
    if (!fileName) return null
    // OSC uploaded a diagram but the presigned URL couldn't be resolved
    // (typically: OSC organization has no s3BucketName configured). Show an
    // explicit placeholder so the assessor knows a diagram exists and who to chase.
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <div className="border border-dashed rounded-lg bg-muted/30 aspect-video flex flex-col items-center justify-center gap-2 text-center p-4">
          <ImageOff className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">Diagram unavailable</p>
          <p className="text-xs text-muted-foreground max-w-md">
            {fileName} was uploaded by the OSC but cannot be displayed.
            Contact support — the organization&apos;s storage configuration is incomplete.
          </p>
        </div>
      </div>
    )
  }

  const thumbnail = (
    <>
      <Image
        src={url}
        alt={label}
        fill
        className="object-contain"
        sizes="(max-width: 768px) 100vw, 800px"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
        <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </>
  )

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="border rounded-lg overflow-hidden bg-muted/30">
        {reviewHref ? (
          <Link
            href={reviewHref}
            className="relative block w-full aspect-video cursor-pointer group"
            aria-label={`Open ${label} review page`}
          >
            {thumbnail}
          </Link>
        ) : (
          <div className="relative w-full aspect-video group">{thumbnail}</div>
        )}
      </div>
      {fileName && (
        <p className="text-xs text-muted-foreground">{fileName}</p>
      )}
    </div>
  )
}

export function ReadOnlyBanner() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-center gap-2.5 mb-4">
      <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
        C3PAO Read-Only View
      </span>
      <span className="text-xs text-amber-600 dark:text-amber-400">
        This data belongs to the OSC. You are viewing it for assessment purposes only.
      </span>
    </div>
  )
}
