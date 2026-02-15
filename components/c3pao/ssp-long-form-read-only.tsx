'use client'

import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SSPTableOfContents } from '@/components/ssp/SSPTableOfContents'
import { SSPControlFamilyReadOnly } from './ssp-control-family-read-only'
import { format } from 'date-fns'
import {
  User,
  Phone,
  Mail,
  Shield,
  FileText,
  Download,
  ZoomIn,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ObjectiveStatus {
  id: string
  status: string
  implementationStatement: string | null
  policyReference: string | null
  procedureReference: string | null
  evidenceDescription: string | null
  inheritedStatus: string | null
  responsibilityDescription: string | null
  dependentESP?: { id: string; providerName: string } | null
  espMappings?: Array<{ esp: { id: string; providerName: string } }>
}

interface Objective {
  id: string
  objectiveReference: string
  description: string
  statuses: ObjectiveStatus[]
}

interface RequirementStatusInfo {
  id: string
  status: string
  implementationNotes: string | null
  implementationType: string | null
  processOwner: string | null
  processOperator: string | null
  occurrence: string | null
  technologyInUse: string | null
  documentationLocation: string | null
  supportingPolicy: string | null
  supportingStandard: string | null
  supportingProcedure: string | null
}

interface Requirement {
  id: string
  requirementId: string
  title: string
  basicRequirement: string
  derivedRequirement: string | null
  objectives: Objective[]
  statuses: RequirementStatusInfo[]
}

interface Family {
  id: string
  code: string
  name: string
  requirements: Requirement[]
}

interface ATOPackage {
  id: string
  name: string
  cmmcLevel: string
  organization: {
    name: string
    dunsNumber: string | null
    cageCode: string | null
  } | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SSPData {
  [key: string]: any
}

interface SSPLongFormReadOnlyProps {
  ssp: SSPData
  families: Family[]
  atoPackage: ATOPackage
}

function ReadOnlyField({ label, value, className }: { label: string; value: unknown; className?: string }) {
  if (!value || (typeof value === 'string' && !value.trim())) return null
  return (
    <div className={`space-y-1 ${className || ''}`}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <p className="text-sm whitespace-pre-wrap">{String(value)}</p>
    </div>
  )
}

function ReadOnlyTextArea({ label, value }: { label: string; value: unknown }) {
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

function ContactCard({ title, name, email, phone }: { title: string; name: string | null; email?: string | null; phone?: string | null }) {
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

function DiagramDisplay({ label, url, fileName }: { label: string; url: string | null | undefined; fileName?: string | null }) {
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

export function SSPLongFormReadOnly({ ssp, families, atoPackage }: SSPLongFormReadOnlyProps) {
  const poamSummary = ssp.poamSummary ? JSON.parse(ssp.poamSummary) : null
  const assetInventory = ssp.assetInventorySummary ? JSON.parse(ssp.assetInventorySummary) : null
  const acronyms = ssp.acronyms ? JSON.parse(ssp.acronyms) : {}
  const references = ssp.references ? JSON.parse(ssp.references) : []

  const operatingModels: string[] = []
  if (ssp.operatingModelPublicCloud) operatingModels.push('Public Cloud')
  if (ssp.operatingModelPrivateCloud) operatingModels.push('Private Cloud')
  if (ssp.operatingModelDataCenter) operatingModels.push('Data Center')
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

  const tocItems = [
    { id: 'section-cover', label: '1. Cover Page', level: 0 },
    { id: 'section-identification', label: '2. System Identification', level: 0 },
    { id: 'section-description', label: '3. System Description', level: 0 },
    { id: 'section-environment', label: '4. System Environment', level: 0 },
    { id: 'section-network', label: '5. Network & Interconnections', level: 0 },
    { id: 'section-roles', label: '6. Roles & Responsibilities', level: 0 },
    { id: 'section-sdlc', label: '7. SDLC', level: 0 },
    {
      id: 'section-controls',
      label: '8. Control Implementation',
      level: 0,
      children: families.map((f) => ({
        id: `family-${f.code}`,
        label: `${f.code} - ${f.name}`,
        level: 1,
      })),
    },
    { id: 'section-policies', label: '9. Policies & Procedures', level: 0 },
    { id: 'section-poam', label: '10. POA&M Summary', level: 0 },
    { id: 'section-assets', label: '11. Asset Inventory', level: 0 },
    { id: 'section-appendices', label: '12. Appendices', level: 0 },
  ]

  return (
    <div className="flex gap-6">
      <div className="hidden lg:block w-64 shrink-0">
        <SSPTableOfContents items={tocItems} />
      </div>

      <div className="flex-1 min-w-0 space-y-8 max-w-4xl">
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              C3PAO Read-Only View
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              This is the OSC&apos;s System Security Plan. You are viewing this document for assessment purposes.
            </p>
          </div>
        </div>

        {ssp.importedFileUrl && (
          <div className="rounded-lg border bg-muted/50 p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                Imported document: {ssp.importedFileName}
              </p>
              <p className="text-xs text-muted-foreground">
                This SSP was originally imported from an uploaded document.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={ssp.importedFileUrl} download={ssp.importedFileName || 'ssp'}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
          </div>
        )}

        {/* 1. COVER PAGE */}
        <section id="section-cover" className="space-y-6 border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-bold border-b pb-2">1. Cover Page & Scoping</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <ReadOnlyField label="System Name" value={ssp.systemName} />
              <ReadOnlyField label="System Abbreviation" value={ssp.systemAbbreviation} />
              <ReadOnlyField label="Contract Number" value={ssp.contractNumber} />
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">DUNS #</label>
                <p className="text-sm border rounded-lg p-3 bg-muted/50">
                  {atoPackage.organization?.dunsNumber || 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">CAGE Code</label>
                <p className="text-sm border rounded-lg p-3 bg-muted/50">
                  {atoPackage.organization?.cageCode || 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">CMMC Level</label>
                <div className="pt-1">
                  <Badge variant="outline">Level {atoPackage.cmmcLevel.replace('LEVEL_', '')}</Badge>
                </div>
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="font-medium">Prepared By</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <ReadOnlyField label="Name" value={ssp.preparedByName} />
              <ReadOnlyField label="Email" value={ssp.preparedByEmail} />
              <ReadOnlyField label="Phone" value={ssp.preparedByPhone} />
              <ReadOnlyField label="Department" value={ssp.preparedByDepartment} />
            </div>
          </div>
          <Separator />
          <ReadOnlyTextArea label="Distribution List" value={ssp.distributionList} />
        </section>

        {/* 2. SYSTEM IDENTIFICATION */}
        <section id="section-identification" className="space-y-6 border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-bold border-b pb-2">2. System Identification</h2>
          <ReadOnlyTextArea label="General Description / Purpose" value={ssp.systemPurpose} />
          <ReadOnlyTextArea label="Contracts Containing CUI" value={ssp.contractsContainingCUI} />
          <ReadOnlyTextArea label="CUI Overview" value={ssp.cuiOverview} />
          <Separator />
          <ReadOnlyTextArea label="Key Stakeholders" value={ssp.keyStakeholders} />
          <ReadOnlyField label="Documentation Repository" value={ssp.documentationRepository} />
          <ReadOnlyTextArea label="Data Protection Considerations" value={ssp.dataProtectionNotes} />
          <Separator />
          <h3 className="font-medium">Compliance Requirements</h3>
          <ReadOnlyTextArea label="Statutory Requirements" value={ssp.statutoryRequirements} />
          <ReadOnlyTextArea label="Regulatory Requirements" value={ssp.regulatoryRequirements} />
          <ReadOnlyTextArea label="Contractual Requirements" value={ssp.contractualRequirements} />
        </section>

        {/* 3. SYSTEM DESCRIPTION */}
        <section id="section-description" className="space-y-6 border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-bold border-b pb-2">3. System Description</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium">Security Category</label>
            <p>{ssp.systemCategory || 'Not specified'}</p>
          </div>
          <ReadOnlyTextArea label="General System Description" value={ssp.systemDescription} />
          <ReadOnlyTextArea label="System Architecture" value={ssp.systemArchitecture} />
          <ReadOnlyTextArea label="Authorization Boundary" value={ssp.systemBoundary} />
          {(ssp.networkDiagram || ssp.networkDiagramUrl) && <Separator />}
          <ReadOnlyTextArea label="Network/Boundary Diagram Description" value={ssp.networkDiagram} />
          <DiagramDisplay
            label="Network/Boundary Diagram"
            url={ssp.networkDiagramUrl}
            fileName={ssp.networkDiagramFileName}
          />
        </section>

        {/* 4. SYSTEM ENVIRONMENT */}
        <section id="section-environment" className="space-y-6 border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-bold border-b pb-2">4. System Environment</h2>
          {operatingModels.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Operating Environment Where CUI Exists</h3>
              <div className="flex flex-wrap gap-2">
                {operatingModels.map((m) => (
                  <Badge key={m} variant="outline">{m}</Badge>
                ))}
              </div>
            </div>
          )}
          <Separator />
          {cuiLocations.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Where CUI Is Stored, Transmitted, or Processed</h3>
              <div className="flex flex-wrap gap-2">
                {cuiLocations.map((l) => (
                  <Badge key={l} variant="outline">{l}</Badge>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 5. NETWORK & INTERCONNECTIONS */}
        <section id="section-network" className="space-y-6 border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-bold border-b pb-2">5. Network & Interconnections</h2>
          <ReadOnlyTextArea label="Interconnectivity Overview" value={ssp.interconnectivityOverview} />
          <ReadOnlyTextArea label="Data Flow" value={ssp.dataFlow} />
          <DiagramDisplay
            label="Data Flow Diagram"
            url={ssp.dataFlowDiagramUrl}
            fileName={ssp.dataFlowDiagramFileName}
          />
          {ssp.dataFlowDiagramUrl && <Separator />}
          <ReadOnlyTextArea label="Identification & Authentication Overview" value={ssp.identificationAuthOverview} />
          <ReadOnlyTextArea label="Supply Chain Overview" value={ssp.supplyChainOverview} />
          <ReadOnlyTextArea label="Maintenance & Support Plan" value={ssp.maintenanceSupportPlan} />
        </section>

        {/* 6. ROLES & RESPONSIBILITIES */}
        <section id="section-roles" className="space-y-6 border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-bold border-b pb-2">6. Roles & Responsibilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ContactCard
              title="System Owner"
              name={ssp.systemOwner}
              email={ssp.systemOwnerEmail}
              phone={ssp.systemOwnerPhone}
            />
            <ContactCard
              title="Information System Security Officer (ISSO)"
              name={ssp.securityOfficer}
              email={ssp.securityOfficerEmail}
              phone={ssp.securityOfficerPhone}
            />
            <ContactCard
              title="Authorizing Official (AO)"
              name={ssp.authorizingOfficial}
              email={ssp.authorizingOfficialEmail}
              phone={ssp.authorizingOfficialPhone}
            />
          </div>
          <Separator />
          <ReadOnlyTextArea label="Additional Roles & Responsibilities" value={ssp.additionalRoles} />
        </section>

        {/* 7. SDLC */}
        <section id="section-sdlc" className="space-y-6 border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-bold border-b pb-2">7. System Development Life Cycle</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium">Operational Status</label>
            <Badge variant="outline">{ssp.operationalPhase || 'Not specified'}</Badge>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3">Phase</th>
                  <th className="text-left p-3">Date Planned</th>
                  <th className="text-left p-3">Date Reached</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Initiate', planned: ssp.sdlcInitiatePlanned, reached: ssp.sdlcInitiateReached },
                  { label: 'Develop / Design / Acquire', planned: ssp.sdlcDevelopPlanned, reached: ssp.sdlcDevelopReached },
                  { label: 'Implement', planned: ssp.sdlcImplementPlanned, reached: ssp.sdlcImplementReached },
                  { label: 'Operate & Maintain', planned: ssp.sdlcOperatePlanned, reached: ssp.sdlcOperateReached },
                  { label: 'Dispose', planned: ssp.sdlcDisposePlanned, reached: ssp.sdlcDisposeReached },
                ].map((phase) => (
                  <tr key={phase.label} className="border-t">
                    <td className="p-3">{phase.label}</td>
                    <td className="p-3">{phase.planned ? format(new Date(phase.planned), 'MMM d, yyyy') : '\u2014'}</td>
                    <td className="p-3">{phase.reached ? format(new Date(phase.reached), 'MMM d, yyyy') : '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ReadOnlyTextArea label="Milestones Narrative" value={ssp.sdlcMilestones} />
          <Separator />
          <ReadOnlyTextArea label="Identified Deficiencies & Remediation Plan" value={ssp.deficienciesSummary} />
        </section>

        {/* 8. CONTROL IMPLEMENTATION */}
        <section id="section-controls" className="space-y-6 border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-bold border-b pb-2">8. Control Implementation</h2>
          <p className="text-sm text-muted-foreground">
            This section contains the implementation details for all 110 NIST SP 800-171 controls
            and their 320 assessment objectives. Review the OSC&apos;s documented implementations below.
          </p>
          <div className="space-y-3">
            {families.map((family) => (
              <SSPControlFamilyReadOnly
                key={family.id}
                family={family}
              />
            ))}
          </div>
        </section>

        {/* 9. POLICIES & PROCEDURES */}
        <section id="section-policies" className="space-y-6 border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-bold border-b pb-2">9. Security Policies & Procedures</h2>
          <ReadOnlyTextArea label="Security Policies" value={ssp.securityPolicies} />
          <ReadOnlyTextArea label="Incident Response Plan" value={ssp.incidentResponse} />
          <ReadOnlyTextArea label="Contingency Plan" value={ssp.contingencyPlan} />
          <ReadOnlyTextArea label="Configuration Management" value={ssp.configurationMgmt} />
          <ReadOnlyTextArea label="Maintenance Procedures" value={ssp.maintenanceProcedures} />
          <ReadOnlyTextArea label="Security Training Program" value={ssp.trainingProgram} />
        </section>

        {/* 10. POA&M SUMMARY */}
        <section id="section-poam" className="space-y-6 border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-bold border-b pb-2">10. Plan of Action & Milestones</h2>
          {poamSummary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{poamSummary.summary?.totalOpen || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Open</div>
                </div>
                <div className="text-center p-4 border rounded-lg border-red-200">
                  <div className="text-2xl font-bold text-red-600">{poamSummary.summary?.byCriticality?.critical || 0}</div>
                  <div className="text-xs text-muted-foreground">Critical</div>
                </div>
                <div className="text-center p-4 border rounded-lg border-orange-200">
                  <div className="text-2xl font-bold text-orange-600">{poamSummary.summary?.byCriticality?.high || 0}</div>
                  <div className="text-xs text-muted-foreground">High</div>
                </div>
                <div className="text-center p-4 border rounded-lg border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-600">{poamSummary.summary?.byCriticality?.moderate || 0}</div>
                  <div className="text-xs text-muted-foreground">Moderate</div>
                </div>
                <div className="text-center p-4 border rounded-lg border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">{poamSummary.summary?.byCriticality?.low || 0}</div>
                  <div className="text-xs text-muted-foreground">Low</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No POA&M summary data available.</p>
          )}
        </section>

        {/* 11. ASSET INVENTORY */}
        <section id="section-assets" className="space-y-6 border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-bold border-b pb-2">11. Asset Inventory</h2>
          {assetInventory ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{assetInventory.summary?.totalAssets || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Assets</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{assetInventory.summary?.inScope || 0}</div>
                  <div className="text-xs text-muted-foreground">In Scope</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{assetInventory.summary?.outOfScope || 0}</div>
                  <div className="text-xs text-muted-foreground">Out of Scope</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{assetInventory.summary?.processingCUI || 0}</div>
                  <div className="text-xs text-muted-foreground">Processing CUI</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{assetInventory.summary?.processingFCI || 0}</div>
                  <div className="text-xs text-muted-foreground">Processing FCI</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No asset inventory summary available.</p>
          )}
        </section>

        {/* 12. APPENDICES */}
        <section id="section-appendices" className="space-y-6 border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-bold border-b pb-2">12. Appendices</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium">Acronyms and Abbreviations</label>
            {Object.keys(acronyms).length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(acronyms).map(([key, value]) => (
                      <tr key={key} className="border-t first:border-t-0">
                        <td className="p-2 font-medium w-32">{key}</td>
                        <td className="p-2">{value as string}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No acronyms defined</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">References</label>
            {references.length > 0 ? (
              <div className="space-y-2">
                {references.map((ref: { title: string; document: string }, idx: number) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="font-medium text-sm">{ref.title}</div>
                    <div className="text-xs text-muted-foreground">{ref.document}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No references defined</p>
            )}
          </div>
          <ReadOnlyTextArea label="Additional Information" value={ssp.additionalInfo} />
        </section>
      </div>
    </div>
  )
}
