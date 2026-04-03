'use client'

import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { SSPView } from '@/lib/api-client'
import { ReadOnlyField, ReadOnlyTextArea, ReadOnlyBanner } from './ssp-helpers'

interface SystemProfileTabProps {
  ssp: SSPView | null
  sspLoading: boolean
}

export function SystemProfileTab({ ssp, sspLoading }: SystemProfileTabProps) {
  if (sspLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
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
            System profile information will appear here once the OSC creates their SSP.
          </p>
        </CardContent>
      </Card>
    )
  }

  const operatingModels: string[] = []
  if (ssp.operatingModelPublicCloud) operatingModels.push('Public Cloud')
  if (ssp.operatingModelPrivateCloud) operatingModels.push('Private Cloud')
  if (ssp.operatingModelDataCenter) operatingModels.push('On-Premises Data Center')
  if (ssp.operatingModelHybrid) operatingModels.push(`Hybrid${ssp.operatingModelHybridExplain ? ` (${ssp.operatingModelHybridExplain})` : ''}`)
  if (ssp.operatingModelDispersed) operatingModels.push('Dispersed Endpoints')
  if (ssp.operatingModelAirGapped) operatingModels.push('Air-Gapped')
  if (ssp.operatingModelOther) operatingModels.push(`Other${ssp.operatingModelOtherExplain ? ` (${ssp.operatingModelOtherExplain})` : ''}`)

  const cuiLocations: string[] = []
  if (ssp.cuiEndUserWorkstations) cuiLocations.push('End User Workstations')
  if (ssp.cuiMobileDevices) cuiLocations.push('Mobile Devices')
  if (ssp.cuiServers) cuiLocations.push('Servers')
  if (ssp.cuiIndustrialControlSystems) cuiLocations.push('Industrial Control Systems')
  if (ssp.cuiInternalApplications) cuiLocations.push('Internal Applications')
  if (ssp.cuiSaas) cuiLocations.push('SaaS')
  if (ssp.cuiPaas) cuiLocations.push('PaaS')
  if (ssp.cuiIaas) cuiLocations.push('IaaS')
  if (ssp.cuiOther) cuiLocations.push(`Other${ssp.cuiOtherExplain ? ` (${ssp.cuiOtherExplain})` : ''}`)

  return (
    <div className="space-y-4">
      <ReadOnlyBanner />

      {/* System Identification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">System Identification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReadOnlyTextArea label="General Description / Purpose" value={ssp.systemPurpose} />
          <ReadOnlyTextArea label="Contracts Containing CUI" value={ssp.contractsContainingCUI} />
          <ReadOnlyTextArea label="CUI Overview" value={ssp.cuiOverview} />
          <ReadOnlyTextArea label="Key Stakeholders" value={ssp.keyStakeholders} />
          <ReadOnlyField label="Documentation Repository" value={ssp.documentationRepository} />
          <ReadOnlyTextArea label="Data Protection Considerations" value={ssp.dataProtectionNotes} />
          <ReadOnlyTextArea label="Statutory Requirements" value={ssp.statutoryRequirements} />
          <ReadOnlyTextArea label="Regulatory Requirements" value={ssp.regulatoryRequirements} />
          <ReadOnlyTextArea label="Contractual Requirements" value={ssp.contractualRequirements} />
          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="User Count" value={ssp.userCount} />
            <ReadOnlyField label="Admin Count" value={ssp.adminCount} />
          </div>
        </CardContent>
      </Card>

      {/* System Description */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">System Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReadOnlyTextArea label="General System Description" value={ssp.systemDescription} />
          <ReadOnlyTextArea label="System Architecture" value={ssp.systemArchitecture} />
          <ReadOnlyTextArea label="Authorization Boundary" value={ssp.systemBoundary} />
        </CardContent>
      </Card>

      {/* System Environment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">System Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReadOnlyTextArea label="Operating Environment" value={ssp.systemEnvironment} />
          {operatingModels.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Operating Models</label>
              <div className="flex flex-wrap gap-2">
                {operatingModels.map((m) => (
                  <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                ))}
              </div>
            </div>
          )}
          {cuiLocations.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">CUI Locations</label>
              <div className="flex flex-wrap gap-2">
                {cuiLocations.map((loc) => (
                  <Badge key={loc} variant="outline" className="text-xs">{loc}</Badge>
                ))}
              </div>
            </div>
          )}
          <ReadOnlyField label="Operational Phase" value={ssp.operationalPhase} />
          <ReadOnlyField label="Common Control Provider" value={ssp.commonControlProvider} />
          <ReadOnlyTextArea label="Additional Information" value={ssp.additionalInfo} />
        </CardContent>
      </Card>
    </div>
  )
}
