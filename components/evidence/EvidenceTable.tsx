'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Download,
  Trash2,
  Link as LinkIcon,
  FileText,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { getEvidenceDownloadUrl } from '@/app/actions/evidence';
import { LinkEvidenceDialog } from './LinkEvidenceDialog';
import { DeleteEvidenceDialog } from './DeleteEvidenceDialog';
// Prisma types replaced - data comes from SaaS API as JSON;

type EvidenceWithRelations = Evidence & {
  requirementStatuses: (RequirementStatus & {
    requirement: Requirement & {
      family: RequirementFamily;
    };
  })[];
};

interface EvidenceTableProps {
  evidence: EvidenceWithRelations[];
  packageId: string;
}

export function EvidenceTable({ evidence, packageId }: EvidenceTableProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceWithRelations | null>(null);

  const handleDownload = async (evidenceId: string, fileName: string) => {
    try {
      const result = await getEvidenceDownloadUrl(evidenceId);
      if (result.success && result.data) {
        // Open download URL in new tab
        window.open(result.data.url, '_blank');
        toast.success('Download Started', {
          description: `Downloading ${fileName}`,
        });
      } else {
        toast.error('Download Failed', {
          description: result.error || 'Could not generate download URL',
        });
      }
    } catch (error) {
      console.error('Error downloading evidence:', error);
      toast.error('Download Failed', {
        description: 'An unexpected error occurred',
      });
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileTypeIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileText className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('image')) return '🖼️';
    return <FileText className="h-4 w-4" />;
  };

  const isExpiring = (expirationDate: Date | null): boolean => {
    if (!expirationDate) return false;
    const daysUntilExpiration = Math.ceil(
      (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiration <= 30 && daysUntilExpiration > 0;
  };

  const isExpired = (expirationDate: Date | null): boolean => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Type</TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Linked Controls</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evidence.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center justify-center text-xl">
                    {getFileTypeIcon(item.mimeType)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{item.fileName}</span>
                    {(isExpiring(item.expirationDate) || isExpired(item.expirationDate)) && (
                      <span className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        {isExpired(item.expirationDate) ? 'Expired' : 'Expiring soon'}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatFileSize(item.fileSize)}
                </TableCell>
                <TableCell>
                  {item.requirementStatuses.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.requirementStatuses.slice(0, 2).map((rs) => (
                        <Badge key={rs.id} variant="secondary" className="text-xs">
                          {rs.requirement.requirementId}
                        </Badge>
                      ))}
                      {item.requirementStatuses.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.requirementStatuses.length - 2}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not linked</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(item.uploadedAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-sm">
                  {item.expirationDate ? (
                    <span
                      className={
                        isExpired(item.expirationDate)
                          ? 'text-red-600 font-medium'
                          : isExpiring(item.expirationDate)
                          ? 'text-yellow-600 font-medium'
                          : 'text-muted-foreground'
                      }
                    >
                      {format(new Date(item.expirationDate), 'MMM d, yyyy')}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No expiration</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDownload(item.id, item.fileName)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedEvidence(item);
                          setLinkDialogOpen(true);
                        }}
                      >
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Link to Controls
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          setSelectedEvidence(item);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Link Evidence Dialog */}
      {selectedEvidence && (
        <LinkEvidenceDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          evidence={selectedEvidence}
          packageId={packageId}
        />
      )}

      {/* Delete Evidence Dialog */}
      {selectedEvidence && (
        <DeleteEvidenceDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          evidence={selectedEvidence}
        />
      )}
    </>
  );
}
