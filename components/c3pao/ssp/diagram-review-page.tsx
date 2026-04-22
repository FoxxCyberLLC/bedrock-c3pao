'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { GitBranch, ImageOff, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { InternalReviewThread } from '@/components/c3pao/internal-review-thread'

interface DiagramReviewPageProps {
  engagementId: string
  diagramType: 'network' | 'dataflow'
  label: string
  imageUrl: string | null
  fileName: string | null
  lastModified: string
  currentUserId: string
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

export function DiagramReviewPage({
  engagementId,
  diagramType,
  label,
  imageUrl,
  fileName,
  lastModified,
  currentUserId,
}: DiagramReviewPageProps) {
  const [zoom, setZoom] = useState(1)

  const entityId = diagramType === 'network' ? 'NETWORK' : 'DATAFLOW'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      {/* Preview column */}
      <div className="space-y-4 min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <GitBranch className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{label}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {fileName ? <span className="truncate">{fileName}</span> : <span>No file uploaded</span>}
            </div>
          </div>
          {imageUrl && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
                disabled={zoom <= MIN_ZOOM}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs tabular-nums w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
                disabled={zoom >= MAX_ZOOM}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom(1)}
                disabled={zoom === 1}
                aria-label="Reset zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {imageUrl ? (
              <div
                className="bg-muted/30 overflow-auto"
                style={{ maxHeight: 'calc(100vh - 260px)', minHeight: '500px' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={label}
                  className="block mx-auto origin-top-left transition-transform"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <ImageOff className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">Diagram unavailable</p>
                <p className="text-xs mt-1 max-w-md text-center">
                  {fileName
                    ? `${fileName} was uploaded by the OSC but cannot be displayed. Contact support — the organization's storage configuration is incomplete.`
                    : 'The OSC has not uploaded this diagram yet.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar column */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>{label}</span>
            </div>
            {fileName && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">File</span>
                <span className="truncate max-w-[220px]">{fileName}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">SSP last modified</span>
              <span>{format(new Date(lastModified), 'MMM d, yyyy')}</span>
            </div>
          </CardContent>
        </Card>

        <InternalReviewThread
          engagementId={engagementId}
          entityType="SSP_DIAGRAM"
          entityId={entityId}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  )
}
