'use client';

import {
  Server,
  FileCheck,
  ListChecks,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { STIGStatistics } from '@/lib/stig/types';

interface STIGDashboardProps {
  statistics: STIGStatistics;
}

export function STIGDashboard({ statistics }: STIGDashboardProps) {
  const {
    totalTargets,
    totalChecklists,
    totalRules,
    byStatus,
    compliancePercentage,
  } = statistics;

  // Determine compliance color
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* Compliance Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compliance</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getComplianceColor(compliancePercentage)}`}>
            {compliancePercentage}%
          </div>
          <Progress
            value={compliancePercentage}
            className={`h-2 mt-2 ${getProgressClass(compliancePercentage)}`}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {byStatus.NOT_A_FINDING + byStatus.NOT_APPLICABLE} of {totalRules - byStatus.NOT_REVIEWED} assessed
          </p>
        </CardContent>
      </Card>

      {/* Targets Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Targets</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTargets}</div>
          <p className="text-xs text-muted-foreground">
            Systems scanned
          </p>
        </CardContent>
      </Card>

      {/* STIGs Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">STIGs</CardTitle>
          <FileCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalChecklists}</div>
          <p className="text-xs text-muted-foreground">
            Checklists imported
          </p>
        </CardContent>
      </Card>

      {/* Total Rules Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
          <ListChecks className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalRules}</div>
          <p className="text-xs text-muted-foreground">
            Security checks
          </p>
        </CardContent>
      </Card>

      {/* Open Findings Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Findings</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${byStatus.OPEN > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
            {byStatus.OPEN}
          </div>
          <p className="text-xs text-muted-foreground">
            Require remediation
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface STIGStatusSummaryProps {
  byStatus: STIGStatistics['byStatus'];
  totalRules: number;
}

export function STIGStatusSummary({ byStatus, totalRules }: STIGStatusSummaryProps) {
  const statuses = [
    {
      key: 'NOT_A_FINDING',
      label: 'Not a Finding',
      count: byStatus.NOT_A_FINDING,
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      key: 'OPEN',
      label: 'Open',
      count: byStatus.OPEN,
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      key: 'NOT_APPLICABLE',
      label: 'Not Applicable',
      count: byStatus.NOT_APPLICABLE,
      icon: HelpCircle,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    },
    {
      key: 'NOT_REVIEWED',
      label: 'Not Reviewed',
      count: byStatus.NOT_REVIEWED,
      icon: HelpCircle,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statuses.map((status) => {
        const Icon = status.icon;
        const percentage = totalRules > 0 ? Math.round((status.count / totalRules) * 100) : 0;
        return (
          <div
            key={status.key}
            className={`flex items-center gap-3 p-3 rounded-lg ${status.bgColor}`}
          >
            <Icon className={`h-5 w-5 ${status.color}`} />
            <div>
              <p className={`text-lg font-semibold ${status.color}`}>{status.count}</p>
              <p className="text-xs text-muted-foreground">
                {status.label} ({percentage}%)
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
