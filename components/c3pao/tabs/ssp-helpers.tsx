'use client'

import Image from 'next/image'
import { User, Phone, Mail, ZoomIn } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'

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

export function DiagramDisplay({
  label,
  url,
  fileName,
}: {
  label: string
  url: string | null | undefined
  fileName?: string | null
}) {
  if (!url) return null
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="border rounded-lg overflow-hidden bg-muted/30">
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="relative w-full aspect-video cursor-zoom-in group"
            >
              <Image
                src={url}
                alt={label}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 800px"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
            <div className="relative w-full h-[80vh]">
              <Image
                src={url}
                alt={label}
                fill
                className="object-contain"
                sizes="90vw"
              />
            </div>
          </DialogContent>
        </Dialog>
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
