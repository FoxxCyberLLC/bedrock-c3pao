'use client'

import { FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { SSPView } from '@/lib/api-client'
import { ReadOnlyTextArea, DiagramDisplay, ReadOnlyBanner } from './ssp-helpers'

interface NetworkTabProps {
  ssp: SSPView | null
  sspLoading: boolean
}

export function NetworkTab({ ssp, sspLoading }: NetworkTabProps) {
  if (sspLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!ssp) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium">No SSP data available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Network information will appear here once the OSC creates their SSP.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <ReadOnlyBanner />

      {/* Network Architecture */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Network Architecture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DiagramDisplay
            label="Network Diagram"
            url={ssp.networkDiagramUrl}
            fileName={ssp.networkDiagramFileName}
          />
          <ReadOnlyTextArea label="Network Description" value={ssp.networkDiagram} />
          <ReadOnlyTextArea label="Interconnectivity Overview" value={ssp.interconnectivityOverview} />
          <ReadOnlyTextArea label="Interconnections" value={ssp.interconnections} />
        </CardContent>
      </Card>

      {/* Data Flow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Data Flow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DiagramDisplay
            label="Data Flow Diagram"
            url={ssp.dataFlowDiagramUrl}
            fileName={ssp.dataFlowDiagramFileName}
          />
          <ReadOnlyTextArea label="Data Flow Description" value={ssp.dataFlow} />
        </CardContent>
      </Card>
    </div>
  )
}
