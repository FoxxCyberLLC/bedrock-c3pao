'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { safeDate } from '@/lib/utils'
import {
  FileText,
  Download,
  Shield,
  Building2,
  Users,
  Server,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Network,
  FileWarning,
  Workflow,
  BookOpen,
  Briefcase,
  ServerCog,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface SSP {
  id: string
  version: string
  status: string
  approvedBy: string | null
  approvedAt: Date | null
  expirationDate: Date | null
  systemName: string | null
  systemAbbreviation: string | null
  systemCategory: string | null
  systemPurpose: string | null
  systemDescription: string | null
  systemArchitecture: string | null
  systemBoundary: string | null
  systemEnvironment: string | null
  networkDiagram: string | null
  dataFlow: string | null
  interconnections: string | null
  systemOwner: string | null
  securityOfficer: string | null
  authorizingOfficial: string | null
  securityPolicies: string | null
  incidentResponse: string | null
  contingencyPlan: string | null
  configurationMgmt: string | null
  maintenanceProcedures: string | null
  trainingProgram: string | null
  generatedAt: Date | null
  pdfUrl: string | null
  lastModified: Date
  createdAt: Date
}

interface Asset {
  id: string
  name: string
  assetType: string
  assetCategory: string
  description: string | null
  ipAddress: string | null
  macAddress: string | null
  hostname: string | null
  location: string | null
  owner: string | null
  processesCUI: boolean
  processesFCI: boolean
}

interface ExternalServiceProvider {
  id: string
  providerName: string
  providerType: string
  services: string | null
  status: string
  contractEndDate: Date | null
  cmmcLevel: string | null
  cmmcCertified: boolean
  fedRampCertified: boolean
  fedRampLevel: string | null
}

interface DocumentsViewerProps {
  ssp: SSP | null
  assets: Asset[]
  externalServiceProviders: ExternalServiceProvider[]
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  APPROVED: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/20' },
  REVIEW: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/20' },
  DRAFT: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
  ARCHIVED: { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/20' },
}

function SSPSection({
  title,
  icon: Icon,
  content,
  defaultOpen = false
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  content: string | null
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (!content) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </CollapsibleTrigger>
    </Collapsible>
  )
}

export function DocumentsViewer({ ssp, assets, externalServiceProviders }: DocumentsViewerProps) {
  const [activeTab, setActiveTab] = useState('ssp')

  // Asset stats
  const assetStats = {
    total: assets.length,
    cuiMarked: assets.filter(a => a.processesCUI || a.processesFCI).length,
    byCategory: assets.reduce((acc, a) => {
      acc[a.assetCategory] = (acc[a.assetCategory] || 0) + 1
      return acc
    }, {} as Record<string, number>),
  }

  // ESP stats
  const espStats = {
    total: externalServiceProviders.length,
    certified: externalServiceProviders.filter(e => e.cmmcCertified || e.fedRampCertified).length,
    expiringSoon: externalServiceProviders.filter(e => {
      const d = safeDate(e.contractEndDate)
      if (!d) return false
      const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return days <= 90 && days > 0
    }).length,
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ssp" className="gap-2">
            <FileText className="h-4 w-4" />
            System Security Plan
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-2">
            <Server className="h-4 w-4" />
            Assets ({assets.length})
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Service Providers ({externalServiceProviders.length})
          </TabsTrigger>
        </TabsList>

        {/* SSP Tab */}
        <TabsContent value="ssp" className="space-y-4">
          {ssp ? (
            <>
              {/* SSP Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={`${statusColors[ssp.status]?.bg} ${statusColors[ssp.status]?.text} ${statusColors[ssp.status]?.border}`}>
                          {ssp.status}
                        </Badge>
                        <Badge variant="outline">Version {ssp.version}</Badge>
                      </div>
                      <CardTitle className="text-xl">
                        {ssp.systemName || 'System Security Plan'}
                        {ssp.systemAbbreviation && (
                          <span className="text-muted-foreground ml-2">({ssp.systemAbbreviation})</span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {ssp.systemCategory && `${ssp.systemCategory} System`}
                        {ssp.systemEnvironment && ` • ${ssp.systemEnvironment}`}
                      </CardDescription>
                    </div>
                    {ssp.pdfUrl && (
                      <Button variant="outline" asChild>
                        <a href={ssp.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </a>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    {ssp.approvedAt && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <div className="text-xs text-muted-foreground">Approved</div>
                          <div className="text-sm font-medium">{safeDate(ssp.approvedAt) ? format(safeDate(ssp.approvedAt)!, 'MMM d, yyyy') : '—'}</div>
                          {ssp.approvedBy && <div className="text-xs text-muted-foreground">by {ssp.approvedBy}</div>}
                        </div>
                      </div>
                    )}
                    {ssp.expirationDate && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10">
                        <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <div className="text-xs text-muted-foreground">Expires</div>
                          <div className="text-sm font-medium">{safeDate(ssp.expirationDate) ? format(safeDate(ssp.expirationDate)!, 'MMM d, yyyy') : '—'}</div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Last Modified</div>
                        <div className="text-sm font-medium">{safeDate(ssp.lastModified) ? format(safeDate(ssp.lastModified)!, 'MMM d, yyyy') : '—'}</div>
                      </div>
                    </div>
                    {ssp.generatedAt && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="text-xs text-muted-foreground">Generated</div>
                          <div className="text-sm font-medium">{safeDate(ssp.generatedAt) ? format(safeDate(ssp.generatedAt)!, 'MMM d, yyyy') : '—'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Key Personnel */}
              {(ssp.systemOwner || ssp.securityOfficer || ssp.authorizingOfficial) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Key Personnel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      {ssp.systemOwner && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground mb-1">System Owner</div>
                          <div className="text-sm font-medium">{ssp.systemOwner}</div>
                        </div>
                      )}
                      {ssp.securityOfficer && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground mb-1">Information System Security Officer (ISSO)</div>
                          <div className="text-sm font-medium">{ssp.securityOfficer}</div>
                        </div>
                      )}
                      {ssp.authorizingOfficial && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground mb-1">Authorizing Official (AO)</div>
                          <div className="text-sm font-medium">{ssp.authorizingOfficial}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SSP Sections */}
              <div className="space-y-3">
                <SSPSection title="System Purpose" icon={Building2} content={ssp.systemPurpose} defaultOpen />
                <SSPSection title="System Description" icon={FileText} content={ssp.systemDescription} />
                <SSPSection title="System Architecture" icon={Network} content={ssp.systemArchitecture} />
                <SSPSection title="System Boundary" icon={Shield} content={ssp.systemBoundary} />
                <SSPSection title="Data Flow" icon={Workflow} content={ssp.dataFlow} />
                <SSPSection title="Security Policies" icon={BookOpen} content={ssp.securityPolicies} />
                <SSPSection title="Incident Response Plan" icon={AlertTriangle} content={ssp.incidentResponse} />
                <SSPSection title="Contingency Plan" icon={FileWarning} content={ssp.contingencyPlan} />
                <SSPSection title="Configuration Management" icon={ServerCog} content={ssp.configurationMgmt} />
                <SSPSection title="Maintenance Procedures" icon={Server} content={ssp.maintenanceProcedures} />
                <SSPSection title="Training Program" icon={Users} content={ssp.trainingProgram} />
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No System Security Plan</h3>
                <p className="text-muted-foreground mt-1">
                  The customer has not generated an SSP for this package yet
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          {/* Asset Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Asset Inventory Overview</CardTitle>
              <CardDescription>
                {assetStats.total} assets | {assetStats.cuiMarked} marked for CUI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(assetStats.byCategory).map(([category, count]) => (
                  <div key={category} className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xl font-bold">{count}</div>
                    <div className="text-xs text-muted-foreground">{category}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Asset Table */}
          {assets.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>CUI/FCI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div className="font-medium">{asset.name}</div>
                          {asset.ipAddress && (
                            <div className="text-xs text-muted-foreground">{asset.ipAddress}</div>
                          )}
                          {asset.hostname && (
                            <div className="text-xs text-muted-foreground">{asset.hostname}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{asset.assetType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              asset.assetCategory === 'IN_SCOPE'
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-gray-500/10 text-gray-600'
                            }
                          >
                            {asset.assetCategory.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {asset.location || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {asset.processesCUI && (
                              <Badge className="bg-red-500/10 text-red-600">CUI</Badge>
                            )}
                            {asset.processesFCI && (
                              <Badge className="bg-orange-500/10 text-orange-600">FCI</Badge>
                            )}
                            {!asset.processesCUI && !asset.processesFCI && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Server className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No Assets Documented</h3>
                <p className="text-muted-foreground mt-1">
                  The customer has not documented any assets yet
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Service Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          {/* ESP Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">External Service Providers Overview</CardTitle>
              <CardDescription>
                {espStats.total} providers | {espStats.certified} CMMC certified
                {espStats.expiringSoon > 0 && ` | ${espStats.expiringSoon} contracts expiring soon`}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* ESP Table */}
          {externalServiceProviders.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>CMMC Level</TableHead>
                      <TableHead>Contract Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {externalServiceProviders.map((esp) => (
                      <TableRow key={esp.id}>
                        <TableCell className="font-medium">{esp.providerName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{esp.providerType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {esp.services || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              esp.status === 'ACTIVE'
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-gray-500/10 text-gray-600'
                            }
                          >
                            {esp.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {esp.cmmcLevel && (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline">{esp.cmmcLevel}</Badge>
                                {esp.cmmcCertified && (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                            )}
                            {esp.fedRampCertified && esp.fedRampLevel && (
                              <Badge className="bg-blue-500/10 text-blue-600">
                                FedRAMP {esp.fedRampLevel}
                              </Badge>
                            )}
                            {!esp.cmmcLevel && !esp.fedRampCertified && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {safeDate(esp.contractEndDate)
                            ? format(safeDate(esp.contractEndDate)!, 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No External Service Providers</h3>
                <p className="text-muted-foreground mt-1">
                  The customer has not documented any external service providers
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
