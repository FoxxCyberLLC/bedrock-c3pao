'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

import type { POAMWithRelations } from '@/lib/types/poam';
import {
  calculateCompletionPercentage,
  getDaysRemaining,
  getDeadlineWarningLevel,
} from '@/lib/utils/poam-rules';

interface POAMListProps {
  poams: POAMWithRelations[];
  atoPackageId: string;
}

export function POAMList({ poams, atoPackageId }: POAMListProps) {
  // Sort POAMs: overdue first, then by risk level, then by deadline
  const sortedPOAMs = useMemo(() => {
    return [...poams].sort((a, b) => {
      // Closed items last
      if (a.status === 'CLOSED' && b.status !== 'CLOSED') return 1;
      if (a.status !== 'CLOSED' && b.status === 'CLOSED') return -1;

      // Overdue first
      if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
      if (a.status !== 'OVERDUE' && b.status === 'OVERDUE') return 1;

      // Then by risk level (Critical > High > Moderate > Low)
      const riskOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
      const riskDiff = (riskOrder[a.riskLevel] ?? 4) - (riskOrder[b.riskLevel] ?? 4);
      if (riskDiff !== 0) return riskDiff;

      // Then by deadline (earliest first)
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [poams]);

  if (poams.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No POAMs found. Create a POAM to track deficiencies and remediation
          efforts.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedPOAMs.map((poam) => (
        <POAMCard key={poam.id} poam={poam} atoPackageId={atoPackageId} />
      ))}
    </div>
  );
}

interface POAMCardProps {
  poam: POAMWithRelations;
  atoPackageId: string;
}

function POAMCard({ poam, atoPackageId }: POAMCardProps) {
  const completionPercentage = calculateCompletionPercentage(poam.milestones);
  const daysRemaining = getDaysRemaining(new Date(poam.deadline));
  const warningLevel = getDeadlineWarningLevel(new Date(poam.deadline));

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <RiskBadge riskLevel={poam.riskLevel} />
              <StatusBadge status={poam.status} />
              <TypeBadge type={poam.type} />
            </div>
            <Link
              href={`/cmmc/poams/${poam.id}`}
              className="group inline-block"
            >
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                {poam.title}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {poam.description}
            </p>
          </div>

          <Button asChild variant="ghost" size="sm">
            <Link href={`/cmmc/poams/${poam.id}`}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Requirements Info */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            Requirement{(poam.requirements ?? []).length !== 1 ? 's' : ''}:
          </span>
          {(poam.requirements ?? []).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {poam.requirements.map((req: any, idx: number) => (
                <span key={req.id}>
                  <Link
                    href={`/cmmc/ato-packages/${atoPackageId}/requirements/${req.requirement.id}`}
                    className="text-primary hover:underline"
                  >
                    {req.requirement.requirementId} - {req.requirement.title}
                  </Link>
                  {idx < poam.requirements.length - 1 && ', '}
                </span>
              ))}
            </div>
          ) : poam.requirement ? (
            <Link
              href={`/cmmc/ato-packages/${atoPackageId}/requirements/${poam.requirement.id}`}
              className="text-primary hover:underline"
            >
              {poam.requirement.requirementId} - {poam.requirement.title}
            </Link>
          ) : (
            <span className="text-muted-foreground">No requirements linked</span>
          )}
        </div>

        {/* Progress */}
        {poam.milestones.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} />
            <p className="text-xs text-muted-foreground">
              {poam.milestones.filter((m: any) => m.completed).length} of{' '}
              {poam.milestones.length} milestones completed
            </p>
          </div>
        )}

        {/* Deadline Info */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Due:</span>
              <span className={cn(
                'font-medium',
                poam.status === 'OVERDUE' && 'text-red-600',
                warningLevel === 'critical' && poam.status !== 'CLOSED' && 'text-red-600',
                warningLevel === 'warning' && poam.status !== 'CLOSED' && 'text-orange-600'
              )}>
                {format(new Date(poam.deadline), 'MMM d, yyyy')}
              </span>
            </div>
            {poam.status !== 'CLOSED' && poam.status !== 'OVERDUE' && (
              <span className={cn(
                'text-sm',
                warningLevel === 'critical' && 'text-red-600 font-medium',
                warningLevel === 'warning' && 'text-orange-600 font-medium',
                warningLevel === 'normal' && 'text-muted-foreground'
              )}>
                ({daysRemaining} days remaining)
              </span>
            )}
            {poam.status === 'OVERDUE' && (
              <span className="text-red-600 font-medium">
                (Overdue by {Math.abs(daysRemaining)} days)
              </span>
            )}
          </div>

          {poam.actualCompletionDate && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Completed {format(new Date(poam.actualCompletionDate), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function RiskBadge({ riskLevel }: { riskLevel: string }) {
  const variants: Record<string, { variant: 'default' | 'destructive' | 'outline' | 'secondary'; icon: React.ComponentType<{ className?: string }> }> = {
    CRITICAL: { variant: 'destructive', icon: AlertCircle },
    HIGH: { variant: 'destructive', icon: AlertCircle },
    MODERATE: { variant: 'default', icon: AlertTriangle },
    LOW: { variant: 'secondary', icon: AlertTriangle },
  };

  const { variant, icon: Icon } = variants[riskLevel] || variants.MODERATE;

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {riskLevel}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: 'default' | 'destructive' | 'outline' | 'secondary'; className?: string }> = {
    OPEN: { variant: 'outline' },
    IN_PROGRESS: { variant: 'default', className: 'bg-blue-600' },
    CLOSED: { variant: 'default', className: 'bg-green-600' },
    OVERDUE: { variant: 'destructive' },
  };

  const { variant, className } = variants[status] || variants.OPEN;

  return (
    <Badge variant={variant} className={className}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className="text-xs">
      {type === 'ASSESSMENT' ? 'Assessment' : 'Operational'}
    </Badge>
  );
}
