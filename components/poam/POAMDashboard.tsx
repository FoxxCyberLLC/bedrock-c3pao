'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

import type { POAMWithRelations, POAMStatistics } from '@/lib/types/poam';
import { getDaysRemaining } from '@/lib/utils/poam-rules';

interface POAMDashboardProps {
  poams: POAMWithRelations[];
  statistics: POAMStatistics;
  atoPackageId: string;
}

export function POAMDashboard({
  poams,
  statistics,
  atoPackageId,
}: POAMDashboardProps) {
  // Find critical/high POAMs that are overdue
  const criticalOverdue = useMemo(() => {
    return poams.filter(
      (p) =>
        (p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH') &&
        p.status === 'OVERDUE'
    );
  }, [poams]);

  // Find POAMs due within 7 days
  const dueSoon = useMemo(() => {
    return poams.filter((p) => {
      if (p.status === 'CLOSED') return false;
      const days = getDaysRemaining(new Date(p.deadline));
      return days >= 0 && days <= 7;
    });
  }, [poams]);

  const completionRate =
    statistics.total > 0
      ? Math.round((statistics.closed / statistics.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {criticalOverdue.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Critical Attention Required</AlertTitle>
          <AlertDescription>
            {criticalOverdue.length} high/critical POA&M
            {criticalOverdue.length > 1 ? 's are' : ' is'} overdue. These must
            be remediated before authorization can be granted.
            <div className="mt-2">
              <Link
                href={`/cmmc/ato-packages/${atoPackageId}/poams?filter=overdue-critical`}
                className="underline font-medium"
              >
                View overdue critical POAMs →
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {dueSoon.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Upcoming Deadlines</AlertTitle>
          <AlertDescription>
            {dueSoon.length} POA&M{dueSoon.length > 1 ? 's are' : ' is'} due
            within the next 7 days.
            <div className="mt-2">
              <Link
                href={`/cmmc/ato-packages/${atoPackageId}/poams?filter=due-soon`}
                className="underline font-medium"
              >
                View upcoming POAMs →
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total POAMs"
          value={statistics.total}
          icon={FileText}
          description="All tracked deficiencies"
        />
        <StatCard
          title="Open"
          value={statistics.open + statistics.inProgress}
          icon={Clock}
          description={`${statistics.open} open, ${statistics.inProgress} in progress`}
          className="border-blue-200 dark:border-blue-800"
        />
        <StatCard
          title="Overdue"
          value={statistics.overdue}
          icon={AlertCircle}
          description="Past deadline"
          className={cn(
            statistics.overdue > 0 && 'border-red-500 bg-red-50 dark:bg-red-950/30 dark:border-red-900'
          )}
          valueClassName={cn(statistics.overdue > 0 && 'text-red-600 dark:text-red-400')}
        />
        <StatCard
          title="Closed"
          value={statistics.closed}
          icon={CheckCircle2}
          description={`${completionRate}% completion rate`}
          className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900"
          valueClassName="text-green-600 dark:text-green-400"
        />
      </div>

      {/* By Risk Level */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">POAMs by Risk Level</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RiskLevelBar
            label="Critical"
            count={statistics.byCriticality.critical}
            total={statistics.total}
            color="bg-red-600"
          />
          <RiskLevelBar
            label="High"
            count={statistics.byCriticality.high}
            total={statistics.total}
            color="bg-orange-600"
          />
          <RiskLevelBar
            label="Moderate"
            count={statistics.byCriticality.moderate}
            total={statistics.total}
            color="bg-yellow-600"
          />
          <RiskLevelBar
            label="Low"
            count={statistics.byCriticality.low}
            total={statistics.total}
            color="bg-blue-600"
          />
        </CardContent>
      </Card>

      {/* By Type */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assessment POAMs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">
                {statistics.byType.assessment}
              </span>
              <Badge variant="outline">Post-Assessment</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              From third-party assessment findings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operational POAMs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">
                {statistics.byType.operational}
              </span>
              <Badge variant="outline">Ongoing</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Temporary deficiencies during operations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Note */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Compliance Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            • <strong>Critical/High POAMs:</strong> Must be closed before
            authorization (FedRAMP requirement)
          </p>
          <p>
            • <strong>Level 3 Assessment POAMs:</strong> Must be closed within
            180 days for final status
          </p>
          <p>
            • <strong>Operational POAMs:</strong> Can maintain &quot;MET&quot; status if
            properly documented with milestones showing progress
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
  className?: string;
  valueClassName?: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  className,
  valueClassName,
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', valueClassName)}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

interface RiskLevelBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function RiskLevelBar({ label, count, total, color }: RiskLevelBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {count} ({Math.round(percentage)}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
