'use client';

import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
// Prisma types replaced - data comes from SaaS API as JSON;

interface STIGRulesTableProps {
  rules: (STIGRule & {
    checklist?: {
      displayName: string;
      stigId: string;
    };
  })[];
  showChecklist?: boolean; // Show which STIG the rule belongs to
}

export function STIGRulesTable({ rules, showChecklist = false }: STIGRulesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<STIGFindingStatus | 'ALL'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<STIGSeverity | 'ALL'>('ALL');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          rule.ruleTitle.toLowerCase().includes(query) ||
          rule.groupId.toLowerCase().includes(query) ||
          rule.ruleId.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && rule.status !== statusFilter) {
        return false;
      }

      // Severity filter
      if (severityFilter !== 'ALL' && rule.severity !== severityFilter) {
        return false;
      }

      return true;
    });
  }, [rules, searchQuery, statusFilter, severityFilter]);

  const toggleRow = (ruleId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId);
    } else {
      newExpanded.add(ruleId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusIcon = (status: STIGFindingStatus) => {
    switch (status) {
      case 'NOT_A_FINDING':
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'OPEN':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'NOT_APPLICABLE':
        return <HelpCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
      case 'NOT_REVIEWED':
        return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    }
  };

  const getStatusBadge = (status: STIGFindingStatus) => {
    const variants: Record<STIGFindingStatus, 'default' | 'destructive' | 'secondary' | 'outline'> = {
      NOT_A_FINDING: 'default',
      OPEN: 'destructive',
      NOT_APPLICABLE: 'secondary',
      NOT_REVIEWED: 'outline',
    };

    const labels: Record<STIGFindingStatus, string> = {
      NOT_A_FINDING: 'Not a Finding',
      OPEN: 'Open',
      NOT_APPLICABLE: 'N/A',
      NOT_REVIEWED: 'Not Reviewed',
    };

    return (
      <Badge variant={variants[status]} className="whitespace-nowrap">
        {labels[status]}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: STIGSeverity) => {
    const colors: Record<STIGSeverity, string> = {
      HIGH: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    };

    return (
      <Badge variant="outline" className={colors[severity]}>
        {severity}
      </Badge>
    );
  };

  // Count stats for filter badges
  const stats = useMemo(() => {
    const byStatus: Record<STIGFindingStatus, number> = {
      OPEN: 0,
      NOT_A_FINDING: 0,
      NOT_APPLICABLE: 0,
      NOT_REVIEWED: 0,
    };
    const bySeverity: Record<STIGSeverity, number> = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    for (const rule of rules) {
      byStatus[rule.status]++;
      bySeverity[rule.severity]++;
    }

    return { byStatus, bySeverity };
  }, [rules]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, group ID, or rule ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as STIGFindingStatus | 'ALL')}
          >
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="OPEN">
                Open ({stats.byStatus.OPEN})
              </SelectItem>
              <SelectItem value="NOT_A_FINDING">
                Not a Finding ({stats.byStatus.NOT_A_FINDING})
              </SelectItem>
              <SelectItem value="NOT_APPLICABLE">
                N/A ({stats.byStatus.NOT_APPLICABLE})
              </SelectItem>
              <SelectItem value="NOT_REVIEWED">
                Not Reviewed ({stats.byStatus.NOT_REVIEWED})
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={severityFilter}
            onValueChange={(value) => setSeverityFilter(value as STIGSeverity | 'ALL')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Severity</SelectItem>
              <SelectItem value="HIGH">High ({stats.bySeverity.HIGH})</SelectItem>
              <SelectItem value="MEDIUM">Medium ({stats.bySeverity.MEDIUM})</SelectItem>
              <SelectItem value="LOW">Low ({stats.bySeverity.LOW})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredRules.length} of {rules.length} rules
      </p>

      {/* Table */}
      {filteredRules.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No Rules Found</h3>
          <p className="mt-2 text-muted-foreground">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Group ID</TableHead>
                <TableHead className="max-w-[400px]">Rule Title</TableHead>
                {showChecklist && <TableHead>STIG</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.map((rule) => (
                <Collapsible
                  key={rule.id}
                  open={expandedRows.has(rule.id)}
                  onOpenChange={() => toggleRow(rule.id)}
                  asChild
                >
                  <>
                    <CollapsibleTrigger asChild>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {expandedRows.has(rule.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(rule.status)}
                            {getStatusBadge(rule.status)}
                          </div>
                        </TableCell>
                        <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                        <TableCell className="font-mono text-sm">{rule.groupId}</TableCell>
                        <TableCell className="max-w-[400px]">
                          <p className="truncate" title={rule.ruleTitle}>
                            {rule.ruleTitle}
                          </p>
                        </TableCell>
                        {showChecklist && rule.checklist && (
                          <TableCell>
                            <Badge variant="outline">{rule.checklist.displayName}</Badge>
                          </TableCell>
                        )}
                      </TableRow>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={showChecklist ? 6 : 5} className="p-0">
                          <div className="p-4 space-y-4">
                            {/* Rule Details */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Rule ID</p>
                                <p className="font-mono">{rule.ruleIdSrc}</p>
                              </div>
                              {rule.ruleVersion && (
                                <div>
                                  <p className="text-muted-foreground">Rule Version</p>
                                  <p className="font-mono">{rule.ruleVersion}</p>
                                </div>
                              )}
                            </div>

                            {/* CCIs */}
                            {rule.ccis && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">CCIs</p>
                                <div className="flex flex-wrap gap-1">
                                  {JSON.parse(rule.ccis).map((cci: string) => (
                                    <Badge key={cci} variant="secondary" className="font-mono text-xs">
                                      {cci}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Finding Details */}
                            {rule.findingDetails && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Finding Details</p>
                                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                  {rule.findingDetails}
                                </pre>
                              </div>
                            )}

                            {/* Comments */}
                            {rule.comments && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Comments</p>
                                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                  {rule.comments}
                                </pre>
                              </div>
                            )}

                            {/* Check Content */}
                            {rule.checkContent && (
                              <details className="group">
                                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                                  Check Content
                                </summary>
                                <pre className="mt-2 text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                  {rule.checkContent}
                                </pre>
                              </details>
                            )}

                            {/* Fix Text */}
                            {rule.fixText && (
                              <details className="group">
                                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                                  Fix Text
                                </summary>
                                <pre className="mt-2 text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                  {rule.fixText}
                                </pre>
                              </details>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
