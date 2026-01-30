'use client';

import { useState } from 'react';
import {
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  HelpCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DeleteSTIGChecklistDialog } from './DeleteSTIGDialog';
import type { STIGChecklistWithCounts } from '@/lib/stig/types';

interface STIGChecklistCardProps {
  checklist: STIGChecklistWithCounts;
  onSelect?: () => void;
  isSelected?: boolean;
  readOnly?: boolean;
  onDeleted?: () => void;
  defaultExpanded?: boolean;
  children?: React.ReactNode; // For embedding rules table
}

export function STIGChecklistCard({
  checklist,
  onSelect,
  isSelected,
  readOnly = false,
  onDeleted,
  defaultExpanded = false,
  children,
}: STIGChecklistCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  return (
    <>
      <Card
        className={`transition-all ${
          isSelected ? 'ring-2 ring-primary' : ''
        } ${onSelect ? 'cursor-pointer hover:border-primary/50' : ''}`}
        onClick={onSelect}
      >
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <FileCheck className="h-5 w-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base font-semibold truncate">
                    {checklist.displayName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Version {checklist.version}
                    {checklist.releaseInfo && ` • ${checklist.releaseInfo}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Compliance Badge */}
                <div className="text-right">
                  <p className={`text-xl font-bold ${getComplianceColor(checklist.compliancePercentage)}`}>
                    {checklist.compliancePercentage}%
                  </p>
                  <p className="text-xs text-muted-foreground">Compliant</p>
                </div>

                {/* Actions */}
                {!readOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Checklist
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Expand/Collapse */}
                <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Stats Row */}
            <div className="flex items-center gap-6 pt-2 pb-3 flex-wrap">
              <div className="flex items-center gap-4">
                <Progress
                  value={checklist.compliancePercentage}
                  className={`h-2 w-32 ${getProgressClass(checklist.compliancePercentage)}`}
                />
              </div>

              {/* Mini Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5" title="Not a Finding">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {checklist.notAFindingCount}
                  </span>
                </div>
                <div className="flex items-center gap-1.5" title="Open">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className={`font-medium ${checklist.openCount > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {checklist.openCount}
                  </span>
                </div>
                <div className="flex items-center gap-1.5" title="Not Applicable">
                  <MinusCircle className="h-4 w-4 text-gray-500" />
                  <span className="text-muted-foreground">
                    {checklist.notApplicableCount}
                  </span>
                </div>
                <div className="flex items-center gap-1.5" title="Not Reviewed">
                  <HelpCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-600 dark:text-yellow-400">
                    {checklist.notReviewedCount}
                  </span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground ml-auto">
                {checklist.totalRules} rules
              </div>
            </div>

            {/* Expandable Content */}
            <CollapsibleContent>
              <div className="pt-4 border-t">
                {children}
              </div>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>

      <DeleteSTIGChecklistDialog
        checklist={checklist}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onDeleted={onDeleted}
      />
    </>
  );
}
