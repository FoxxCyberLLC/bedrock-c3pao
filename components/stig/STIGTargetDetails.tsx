'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Server,
  Network,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  HelpCircle,
  FileCheck,
  Layers,
  List,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { STIGChecklistCard } from './STIGChecklistCard';
import { STIGRulesTable } from './STIGRulesTable';
import { getSTIGRules, getSTIGRulesByTarget } from '@/app/actions/stig';
import type { STIGTargetWithStats, STIGChecklistWithCounts } from '@/lib/stig/types';
// Prisma types replaced - data comes from SaaS API as JSON;

interface STIGTargetDetailsProps {
  target: STIGTargetWithStats;
  packageId: string;
  initialRules: (STIGRule & { checklist?: { displayName: string; stigId: string } })[];
  readOnly?: boolean;
}

export function STIGTargetDetails({
  target,
  packageId,
  initialRules,
  readOnly = false,
}: STIGTargetDetailsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loadingRules, setLoadingRules] = useState(false);
  const [checklistRules, setChecklistRules] = useState<
    Record<string, (STIGRule & { checklist?: { displayName: string; stigId: string } })[]>
  >({});

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

  // Load rules for a specific checklist when its tab is selected
  const loadChecklistRules = async (checklistId: string) => {
    if (checklistRules[checklistId]) return; // Already loaded

    setLoadingRules(true);
    try {
      const result = await getSTIGRules(checklistId);
      if (result.success && result.data) {
        setChecklistRules((prev) => ({
          ...prev,
          [checklistId]: result.data || [],
        }));
      }
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoadingRules(false);
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value !== 'overview' && value !== 'all-rules') {
      loadChecklistRules(value);
    }
  };

  // Handle checklist deletion - redirect back if no more checklists
  const handleChecklistDeleted = () => {
    // The page will refresh via router.refresh() in the dialog
    // If the target was deleted (last checklist), we'll 404 and need to go back
    router.push(`/cmmc/packages/${packageId}/stigs`);
  };

  return (
    <div className="space-y-6">
      {/* Target Header Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{target.totalRules}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Not a Finding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {target.notAFindingCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${target.openCount > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
              {target.openCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-yellow-500" />
              Not Reviewed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {target.notReviewedCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              STIGs Applied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{target.checklists.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      {(target.fqdn || target.macAddress || target.targetType) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cpu className="h-5 w-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {target.fqdn && (
                <div>
                  <p className="text-muted-foreground">FQDN</p>
                  <p className="font-mono">{target.fqdn}</p>
                </div>
              )}
              {target.ipAddress && (
                <div>
                  <p className="text-muted-foreground">IP Address</p>
                  <p className="font-mono">{target.ipAddress}</p>
                </div>
              )}
              {target.macAddress && (
                <div>
                  <p className="text-muted-foreground">MAC Address</p>
                  <p className="font-mono">{target.macAddress}</p>
                </div>
              )}
              {target.targetType && (
                <div>
                  <p className="text-muted-foreground">Target Type</p>
                  <p>{target.targetType}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Interface for Checklists */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="all-rules" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              All Rules
            </TabsTrigger>
            {target.checklists.map((checklist) => (
              <TabsTrigger
                key={checklist.id}
                value={checklist.id}
                className="flex items-center gap-2 max-w-[200px]"
              >
                <FileCheck className="h-4 w-4 shrink-0" />
                <span className="truncate">{checklist.displayName}</span>
                {checklist.openCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                    {checklist.openCount}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Overview Tab - All Checklists as Cards */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Applied STIG Checklists
              </CardTitle>
              <CardDescription>
                {target.checklists.length} checklist{target.checklists.length !== 1 ? 's' : ''} applied to this target
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {target.checklists.map((checklist) => (
                <STIGChecklistCard
                  key={checklist.id}
                  checklist={checklist}
                  readOnly={readOnly}
                  onSelect={() => handleTabChange(checklist.id)}
                  onDeleted={handleChecklistDeleted}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Rules Tab */}
        <TabsContent value="all-rules">
          <Card>
            <CardHeader>
              <CardTitle>All Security Rules</CardTitle>
              <CardDescription>
                Combined rules from all {target.checklists.length} applied STIG checklists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <STIGRulesTable rules={initialRules} showChecklist />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Checklist Tabs */}
        {target.checklists.map((checklist) => (
          <TabsContent key={checklist.id} value={checklist.id}>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{checklist.displayName}</CardTitle>
                    <CardDescription>
                      Version {checklist.version}
                      {checklist.releaseInfo && ` • ${checklist.releaseInfo}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={checklist.compliancePercentage}
                        className={`h-3 w-32 ${getProgressClass(checklist.compliancePercentage)}`}
                      />
                      <span className={`text-lg font-bold ${getComplianceColor(checklist.compliancePercentage)}`}>
                        {checklist.compliancePercentage}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checklist Stats */}
                <div className="flex items-center gap-6 pt-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {checklist.notAFindingCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Compliant</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                      <p className={`text-lg font-semibold ${checklist.openCount > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                        {checklist.openCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Open</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gray-500/10 flex items-center justify-center">
                      <MinusCircle className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-muted-foreground">
                        {checklist.notApplicableCount}
                      </p>
                      <p className="text-xs text-muted-foreground">N/A</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <HelpCircle className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                        {checklist.notReviewedCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Not Reviewed</p>
                    </div>
                  </div>

                  <div className="ml-auto text-right">
                    <p className="text-lg font-semibold">{checklist.totalRules}</p>
                    <p className="text-xs text-muted-foreground">Total Rules</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {loadingRules && !checklistRules[checklist.id] ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <STIGRulesTable rules={checklistRules[checklist.id] || []} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
