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
import type { ESPDetailView } from '@/lib/api-client';

interface C3PAOESPDetailViewProps {
  esp: ESPDetailView;
  engagementId: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-600',
  INACTIVE: 'bg-gray-500',
  UNDER_REVIEW: 'bg-amber-600',
  TERMINATED: 'bg-red-600',
};

const inheritanceBadge: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  NONE: { label: 'None', variant: 'outline' },
  PARTIAL: { label: 'Partial', variant: 'default' },
  FULL: { label: 'Full', variant: 'secondary' },
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return format(new Date(value), 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

export function C3PAOESPDetailView({ esp, engagementId }: C3PAOESPDetailViewProps) {
  const documentCount = [esp.srmFileName, esp.crmFileName].filter(Boolean).length;

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
            <Badge variant="outline" className="text-xs">
              Read Only
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">{esp.providerName}</h1>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Documents ({documentCount})</TabsTrigger>
              <TabsTrigger value="mappings">
                Mappings ({esp.requirementMappings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {(esp.services || esp.systemsAccessed) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Services &amp; Systems</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {esp.services && (
                      <div>
                        <p className="text-sm font-medium mb-1">Services Provided</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {esp.services}
                        </p>
                      </div>
                    )}
                    {esp.systemsAccessed && (
                      <div>
                        <p className="text-sm font-medium mb-1">Systems Accessed</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {esp.systemsAccessed}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>CUI Handling</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <CUIIndicator label="Stores CUI" value={esp.storesCui} />
                    <CUIIndicator label="Processes CUI" value={esp.processesCui} />
                    <CUIIndicator label="Transmits CUI" value={esp.transmitsCui} />
                    <CUIIndicator
                      label="Protects Enclave"
                      value={esp.protectsEnclave}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Compliance &amp; Certification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {esp.fedRampCertified ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">FedRAMP</span>
                      </div>
                      {esp.fedRampCertified && esp.fedRampLevel && (
                        <p className="pl-6 text-sm text-muted-foreground">
                          Level: {esp.fedRampLevel}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {esp.cmmcCertified ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">CMMC</span>
                      </div>
                      {esp.cmmcCertified && esp.cmmcLevel && (
                        <p className="pl-6 text-sm text-muted-foreground">
                          Level: {esp.cmmcLevel.replace('_', ' ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    {esp.dfarsFlowDown ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">
                      DFARS 252.204-7012 Flow-Down
                    </span>
                  </div>
                </CardContent>
              </Card>

              {esp.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {esp.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-6">
              <DocumentCard
                title="Customer Responsibility Matrix (CRM)"
                fileName={esp.crmFileName ?? null}
                fileUrl={esp.crmFileUrl ?? null}
                uploadedAt={esp.crmUploadedAt ?? null}
              />
              <DocumentCard
                title="Shared Responsibility Matrix (SRM)"
                fileName={esp.srmFileName ?? null}
                fileUrl={esp.srmFileUrl ?? null}
                uploadedAt={esp.srmUploadedAt ?? null}
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
                              <Badge variant="outline" className="text-xs">
                                {m.familyCode}
                              </Badge>
                              <span className="text-sm font-medium">
                                {m.controlId}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {m.requirementTitle}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                inheritanceBadge[m.inheritanceType]?.variant ||
                                'outline'
                              }
                            >
                              {inheritanceBadge[m.inheritanceType]?.label ||
                                m.inheritanceType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                            {m.espResponsibility || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                            {m.oscResponsibility || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
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
                  <a
                    href={esp.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    {esp.website}
                  </a>
                </div>
              )}
              {(esp.city || esp.state) && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>
                      {[esp.city, esp.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Documents</span>
                <span className="font-medium">{documentCount}/2</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Requirement Mappings</span>
                <span className="font-medium">
                  {esp.requirementMappings.length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Created</span>
                <span>{formatDate(esp.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Updated</span>
                <span>{formatDate(esp.updatedAt)}</span>
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
      {value ? (
        <CheckCircle className="h-4 w-4 text-amber-600" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
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
  uploadedAt: string | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {fileName ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{fileName}</p>
                {uploadedAt && (
                  <p className="text-xs text-muted-foreground">
                    Uploaded {formatDate(uploadedAt)}
                  </p>
                )}
              </div>
            </div>
            {fileUrl && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Not uploaded by the OSC
          </p>
        )}
      </CardContent>
    </Card>
  );
}
