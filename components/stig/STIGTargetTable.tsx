'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Server,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  Link2,
  Link2Off,
  Plus,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DeleteSTIGTargetDialog } from './DeleteSTIGDialog';
import { LinkAssetDialog } from './LinkAssetDialog';
import { CreateAssetFromTargetDialog } from './CreateAssetFromTargetDialog';
import type { STIGTargetWithStats } from '@/lib/stig/types';
// Prisma types replaced - data comes from SaaS API as JSON;

interface STIGTargetTableProps {
  targets: STIGTargetWithStats[];
  packageId: string;
  readOnly?: boolean;
  basePath?: string; // For C3PAO vs customer paths
  assets?: Asset[]; // Assets available for linking
}

export function STIGTargetTable({
  targets,
  packageId,
  readOnly = false,
  basePath = `/cmmc/packages/${packageId}/stigs`,
  assets = [],
}: STIGTargetTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<STIGTargetWithStats | null>(null);
  const [linkTarget, setLinkTarget] = useState<STIGTargetWithStats | null>(null);
  const [createAssetTarget, setCreateAssetTarget] = useState<STIGTargetWithStats | null>(null);

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressClass = (percentage: number) => {
    if (percentage >= 80) return '[&>div]:bg-green-500';
    if (percentage >= 60) return '[&>div]:bg-yellow-500';
    return '[&>div]:bg-red-500';
  };

  if (targets.length === 0) {
    return (
      <div className="text-center py-12">
        <Server className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No STIG Targets</h3>
        <p className="mt-2 text-muted-foreground">
          Import a CKLB file to add STIG scan results.
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Target</TableHead>
            <TableHead>Linked Asset</TableHead>
            <TableHead className="text-center">STIGs</TableHead>
            <TableHead className="text-center">Rules</TableHead>
            <TableHead className="text-center">Open</TableHead>
            <TableHead>Compliance</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {targets.map((target) => (
            <TableRow key={target.id}>
              <TableCell>
                <Link
                  href={`${basePath}/${target.id}`}
                  className="flex items-center gap-2 hover:text-primary"
                >
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{target.hostname}</p>
                    {target.ipAddress && (
                      <p className="text-xs text-muted-foreground">{target.ipAddress}</p>
                    )}
                  </div>
                </Link>
              </TableCell>
              <TableCell>
                {target.asset ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={`/cmmc/packages/${packageId}/assets`}
                          className="flex items-center gap-2 hover:text-primary"
                        >
                          <Link2 className="h-3 w-3 text-green-500" />
                          <span className="text-sm">{target.asset.name}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          <p className="font-medium">{target.asset.name}</p>
                          <p className="text-muted-foreground">{target.asset.assetType}</p>
                          {target.asset.hostname && <p>Hostname: {target.asset.hostname}</p>}
                          {target.asset.ipAddress && <p>IP: {target.asset.ipAddress}</p>}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Link2Off className="h-3 w-3" />
                    Not linked
                  </span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {target._count?.checklists || target.checklists?.length || 0}
              </TableCell>
              <TableCell className="text-center">
                {target.totalRules}
              </TableCell>
              <TableCell className="text-center">
                {target.openCount > 0 ? (
                  <span className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    {target.openCount}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    0
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress
                    value={target.compliancePercentage}
                    className={`h-2 w-20 ${getProgressClass(target.compliancePercentage)}`}
                  />
                  <span className={`text-sm font-medium ${getComplianceColor(target.compliancePercentage)}`}>
                    {target.compliancePercentage}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`${basePath}/${target.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    {!readOnly && (
                      <>
                        {!target.asset && (
                          <DropdownMenuItem onClick={() => setCreateAssetTarget(target)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Asset from Target
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setLinkTarget(target)}>
                          <Link2 className="mr-2 h-4 w-4" />
                          {target.asset ? 'Change Linked Asset' : 'Link to Existing Asset'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(target)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Target
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {deleteTarget && (
        <DeleteSTIGTargetDialog
          target={deleteTarget}
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        />
      )}

      {linkTarget && (
        <LinkAssetDialog
          target={linkTarget}
          assets={assets}
          open={!!linkTarget}
          onOpenChange={(open) => !open && setLinkTarget(null)}
        />
      )}

      {createAssetTarget && (
        <CreateAssetFromTargetDialog
          target={createAssetTarget}
          open={!!createAssetTarget}
          onOpenChange={(open) => !open && setCreateAssetTarget(null)}
        />
      )}
    </>
  );
}

interface STIGChecklistListProps {
  checklists: STIGTargetWithStats['checklists'];
  targetId: string;
  basePath: string;
}

export function STIGChecklistList({ checklists, targetId, basePath }: STIGChecklistListProps) {
  const getComplianceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-2">
      {checklists.map((checklist) => (
        <div
          key={checklist.id}
          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div>
              <p className="font-medium">{checklist.displayName}</p>
              <p className="text-xs text-muted-foreground">
                Version {checklist.version} &bull; {checklist.totalRules} rules
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {checklist.openCount > 0 && (
              <Badge variant="destructive" className="font-mono">
                {checklist.openCount} open
              </Badge>
            )}
            <span className={`text-sm font-medium ${getComplianceColor(checklist.compliancePercentage)}`}>
              {checklist.compliancePercentage}%
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      ))}
    </div>
  );
}
