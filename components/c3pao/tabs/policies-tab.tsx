'use client'

import { FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { SSPView } from '@/lib/api-client'
import { ReadOnlyTextArea, ReadOnlyBanner } from './ssp-helpers'

interface PoliciesTabProps {
  ssp: SSPView | null
  sspLoading: boolean
}

export function PoliciesTab({ ssp, sspLoading }: PoliciesTabProps) {
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
            Policies and plans will appear here once the OSC creates their SSP.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <ReadOnlyBanner />

      {/* Security Policies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Security Policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReadOnlyTextArea label="Security Policies" value={ssp.securityPolicies} />
          <ReadOnlyTextArea label="Control Statements" value={ssp.controlStatements} />
        </CardContent>
      </Card>

      {/* Plans */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReadOnlyTextArea label="Incident Response" value={ssp.incidentResponse} />
          <ReadOnlyTextArea label="Contingency Plan" value={ssp.contingencyPlan} />
          <ReadOnlyTextArea label="Configuration Management" value={ssp.configurationMgmt} />
          <ReadOnlyTextArea label="Maintenance Procedures" value={ssp.maintenanceProcedures} />
          <ReadOnlyTextArea label="Maintenance Support Plan" value={ssp.maintenanceSupportPlan} />
        </CardContent>
      </Card>

      {/* Identification & Access */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identification &amp; Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReadOnlyTextArea label="Identification & Authentication Overview" value={ssp.identificationAuthOverview} />
        </CardContent>
      </Card>

      {/* Supply Chain */}
      {(ssp.supplyChainOverview || ssp.supplyChainProviders) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Supply Chain</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ReadOnlyTextArea label="Supply Chain Overview" value={ssp.supplyChainOverview} />
            <ReadOnlyTextArea label="Supply Chain Providers" value={ssp.supplyChainProviders} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
