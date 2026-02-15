'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import {
  ChevronLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  CheckCircle,
  XCircle,
  FileText,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OPAStatusBadge } from '@/components/esp/OPAStatusBadge';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ESPWithRelations {
  id: string
  providerName: string
  providerType: string
  status: string
  services: string | null
  systemsAccessed: string | null
  storesCui: boolean
  processesCui: boolean
  transmitsCui: boolean
  protectsEnclave: boolean
  fedRampCertified: boolean
  fedRampLevel: string | null
  cmmcCertified: boolean
  cmmcLevel: string | null
  dfarsFlowDown: boolean
  primaryContact: string | null
  email: string | null
  phone: string | null
  website: string | null
  city: string | null
  state: string | null
  notes: string | null
  srmFileName: string | null
  srmFileUrl: string | null
  srmUploadedAt: Date | null
  crmFileName: string | null
  crmFileUrl: string | null
  crmUploadedAt: Date | null
  providerSSPFileName: string | null
  providerSSPFileUrl: string | null
  providerSSPUploadedAt: Date | null
  createdAt: Date
  updatedAt: Date
  atoPackage: { id: string; name: string }
  requirementMappings: Array<{
    id: string
    inheritanceType: string
    espResponsibility: string | null
    oscResponsibility: string | null
    requirement: {
      requirementId: string
      title: string
      family: { code: string; name: string }
    }
  }>
  dependentOPAs: Array<{
    id: string
    title: string
    status: string
    gapStatement: string
    evidenceRequired: boolean
    evidenceFileName: string | null
    createdAt: Date
    requirement: {
      requirementId: string
      title: string
      family: { code: string }
    }
  }>
}

interface C3PAOESPDetailViewProps {
  esp: ESPWithRelations;
  engagementId: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-600',
  INACTIVE: 'bg-gray-500',
  UNDER_REVIEW: 'bg-amber-600',
  TERMINATED: 'bg-red-600',
};

const inheritanceBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  NONE: { label: 'None', variant: 'outline' },
  PARTIAL: { label: 'Partial', variant: 'default' },
  FULL: { label: 'Full', variant: 'secondary' },
};

export function C3PAOESPDetailView({ esp, engagementId }: C3PAOESPDetailViewProps) {
  const documentCount = [esp.srmFileName, esp.crmFileName, esp.providerSSPFileName].filter(Boolean).length;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href={`/engagements/${engagementId}/esps`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to ESPs
          </Link>
        </Button>

        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default" className={statusColors[esp.status]}>
              {esp.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline">{esp.providerType}</Badge>
            <Badge variant="outline" className="text-xs">Read Only</Badge>
          </div>
          <h1 className="text-3xl font-bold">{esp.providerName}</h1>
          <p className="text-muted-foreground">{esp.atoPackage.name}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Documents ({documentCount})</TabsTrigger>
              <TabsTrigger value="mappings">Mappings ({esp.requirementMappings.length})</TabsTrigger>
              <TabsTrigger value="opas">OPAs ({esp.dependentOPAs.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {(esp.services || esp.systemsAccessed) && (
                <Card>
                  <CardHeader><CardTitle>Services & Systems</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {esp.services && (
                      <div>
                        <p className="text-sm font-medium mb-1">Services Provided</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{esp.services}</p>
                      </div>
                    )}
                    {esp.systemsAccessed && (
                      <div>
                        <p className="text-sm font-medium mb-1">Systems Accessed</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{esp.systemsAccessed}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle>CUI Handling</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <CUIIndicator label="Stores CUI" value={esp.storesCui} />
                    <CUIIndicator label="Processes CUI" value={esp.processesCui} />
                    <CUIIndicator label="Transmits CUI" value={esp.transmitsCui} />
                    <CUIIndicator label="Protects Enclave" value={esp.protectsEnclave} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Compliance & Certification</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {esp.fedRampCertified ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm font-medium">FedRAMP</span>
                      </div>
                      {esp.fedRampCertified && esp.fedRampLevel && (
                        <p className="pl-6 text-sm text-muted-foreground">Level: {esp.fedRampLevel}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {esp.cmmcCertified ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm font-medium">CMMC</span>
                      </div>
                      {esp.cmmcCertified && esp.cmmcLevel && (
                        <p className="pl-6 text-sm text-muted-foreground">Level: {esp.cmmcLevel.replace('_', ' ')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    {esp.dfarsFlowDown ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm font-medium">DFARS 252.204-7012 Flow-Down</span>
                  </div>
                </CardContent>
              </Card>

              {esp.notes && (
                <Card>
                  <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{esp.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-6">
              <DocumentCard
                title="Customer Responsibility Matrix (CRM)"
                fileName={esp.crmFileName}
                fileUrl={esp.crmFileUrl}
                uploadedAt={esp.crmUploadedAt}
              />
              <DocumentCard
                title="Shared Responsibility Matrix (SRM)"
                fileName={esp.srmFileName}
                fileUrl={esp.srmFileUrl}
                uploadedAt={esp.srmUploadedAt}
              />
              <DocumentCard
                title="Provider System Security Plan (SSP)"
                fileName={esp.providerSSPFileName}
                fileUrl={esp.providerSSPFileUrl}
                uploadedAt={esp.providerSSPUploadedAt}
              />
            </TabsContent>

            <TabsContent value="mappings" className="mt-6">
              {esp.requirementMappings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No requirement mappings defined.
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Requirement</TableHead>
                        <TableHead>Inheritance</TableHead>
                        <TableHead>ESP Responsibility</TableHead>
                        <TableHead>OSC Responsibility</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {esp.requirementMappings.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{m.requirement.family.code}</Badge>
                              <span className="text-sm font-medium">{m.requirement.requirementId}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{m.requirement.title}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={inheritanceBadge[m.inheritanceType]?.variant || 'outline'}>
                              {inheritanceBadge[m.inheritanceType]?.label || m.inheritanceType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                            {m.espResponsibility || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                            {m.oscResponsibility || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="opas" className="mt-6">
              {esp.dependentOPAs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No Operational Plans of Action for this ESP.
                </div>
              ) : (
                <div className="space-y-3">
                  {esp.dependentOPAs.map((opa) => (
                    <div key={opa.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <OPAStatusBadge status={opa.status} />
                        <Badge variant="outline" className="text-xs">{opa.requirement.family.code}</Badge>
                        <span className="text-xs text-muted-foreground">{opa.requirement.requirementId}</span>
                        {opa.evidenceRequired && (
                          <span className={`text-xs ${opa.evidenceFileName ? 'text-green-600' : 'text-amber-600'}`}>
                            {opa.evidenceFileName ? 'Evidence received' : 'Evidence pending'}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-medium">{opa.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">{opa.gapStatement}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {format(new Date(opa.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {esp.primaryContact && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{esp.primaryContact}</span>
                </div>
              )}
              {esp.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{esp.email}</span>
                </div>
              )}
              {esp.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{esp.phone}</span>
                </div>
              )}
              {esp.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={esp.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                    {esp.website}
                  </a>
                </div>
              )}
              {(esp.city || esp.state) && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{[esp.city, esp.state].filter(Boolean).join(', ')}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Documents</span>
                <span className="font-medium">{documentCount}/3</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Requirement Mappings</span>
                <span className="font-medium">{esp.requirementMappings.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">OPAs</span>
                <span className="font-medium">{esp.dependentOPAs.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Created</span>
                <span>{format(new Date(esp.createdAt), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span>Updated</span>
                <span>{format(new Date(esp.updatedAt), 'MMM d, yyyy')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CUIIndicator({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {value ? <CheckCircle className="h-4 w-4 text-amber-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
      <span className="text-sm">{label}</span>
    </div>
  );
}

function DocumentCard({
  title,
  fileName,
  fileUrl,
  uploadedAt,
}: {
  title: string;
  fileName: string | null;
  fileUrl: string | null;
  uploadedAt: Date | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {fileName && fileUrl ? (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              {uploadedAt && (
                <p className="text-xs text-muted-foreground">
                  Uploaded {format(new Date(uploadedAt), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <XCircle className="h-4 w-4" />
            <span>Not uploaded</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
