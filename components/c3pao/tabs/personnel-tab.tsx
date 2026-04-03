'use client'

import { FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { SSPView } from '@/lib/api-client'
import { ReadOnlyTextArea, ContactCard, ReadOnlyBanner } from './ssp-helpers'

interface PersonnelTabProps {
  ssp: SSPView | null
  sspLoading: boolean
}

export function PersonnelTab({ ssp, sspLoading }: PersonnelTabProps) {
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
            Personnel information will appear here once the OSC creates their SSP.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <ReadOnlyBanner />

      {/* Key Contacts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Key Contacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <ContactCard
              title="System Owner"
              name={ssp.systemOwner}
              phone={ssp.systemOwnerPhone}
              email={ssp.systemOwnerEmail}
            />
            <ContactCard
              title="Security Officer (ISSO)"
              name={ssp.securityOfficer}
              phone={ssp.securityOfficerPhone}
              email={ssp.securityOfficerEmail}
            />
            <ContactCard
              title="Authorizing Official"
              name={ssp.authorizingOfficial}
              phone={ssp.authorizingOfficialPhone}
              email={ssp.authorizingOfficialEmail}
            />
            <ContactCard
              title="Prepared By"
              name={ssp.preparedByName}
              phone={ssp.preparedByPhone}
              email={ssp.preparedByEmail}
            />
          </div>
        </CardContent>
      </Card>

      {/* Roles and Privileges */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Roles &amp; Privileges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReadOnlyTextArea label="Roles and Privileges" value={ssp.rolesPrivileges} />
          <ReadOnlyTextArea label="Additional Roles" value={ssp.additionalRoles} />
          <ReadOnlyTextArea label="Distribution List" value={ssp.distributionList} />
          <ReadOnlyTextArea label="Training Program" value={ssp.trainingProgram} />
        </CardContent>
      </Card>

      {/* SDLC */}
      {(ssp.sdlcMilestones || ssp.operationalPhase) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">System Development Lifecycle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ReadOnlyTextArea label="SDLC Milestones" value={ssp.sdlcMilestones} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
