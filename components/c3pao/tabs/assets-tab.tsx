'use client'

import {
  Server,
  Monitor,
  Laptop,
  Smartphone,
  Database,
  Globe,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { AssetView, SSPView } from '@/lib/api-client'
import { ReadOnlyBanner } from './ssp-helpers'

interface AssetsTabProps {
  assets: AssetView[]
  assetsLoading: boolean
  ssp?: SSPView | null
}

function getAssetIcon(assetType: string) {
  const iconMap: Record<string, React.ReactNode> = {
    SERVER: <Server className="h-4 w-4" />,
    WORKSTATION: <Monitor className="h-4 w-4" />,
    NETWORK_DEVICE: <Globe className="h-4 w-4" />,
    MOBILE_DEVICE: <Smartphone className="h-4 w-4" />,
    APPLICATION: <Globe className="h-4 w-4" />,
    DATABASE: <Database className="h-4 w-4" />,
    VOIP_DEVICE: <Smartphone className="h-4 w-4" />,
    VIRTUAL_MACHINE: <Server className="h-4 w-4" />,
    OTHER: <Laptop className="h-4 w-4" />,
  }
  return iconMap[assetType] || <Laptop className="h-4 w-4" />
}

export function AssetsTab({ assets, assetsLoading, ssp }: AssetsTabProps) {
  const inventorySummary = ssp?.assetInventorySummary

  return (
    <div className="space-y-4">
      <ReadOnlyBanner />

      {inventorySummary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">SSP Asset Inventory Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{inventorySummary}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Asset Inventory</CardTitle>
          <CardDescription>Systems and components in scope for CMMC compliance</CardDescription>
        </CardHeader>
        <CardContent>
          {assetsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12">
              <Server className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No assets have been added to this system yet.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="divide-y">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        {getAssetIcon(asset.assetType)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{asset.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {asset.assetType.replace(/_/g, ' ')}
                          </Badge>
                          {asset.hostname && (
                            <span className="text-xs text-muted-foreground">{asset.hostname}</span>
                          )}
                          {asset.processesCUI && (
                            <Badge variant="destructive" className="text-xs">CUI</Badge>
                          )}
                          {asset.processesFCI && (
                            <Badge variant="secondary" className="text-xs">FCI</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {asset.location && <p>{asset.location}</p>}
                      {asset.ipAddress && <p>{asset.ipAddress}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
