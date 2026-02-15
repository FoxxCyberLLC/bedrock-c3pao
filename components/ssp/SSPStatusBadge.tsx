import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, FileCheck, Archive } from 'lucide-react';

interface SSPStatusBadgeProps {
  status: string;
  className?: string;
}

export function SSPStatusBadge({ status, className }: SSPStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return {
          label: 'Draft',
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-gray-100 text-gray-700 border-gray-300',
        };
      case 'REVIEW':
        return {
          label: 'Under Review',
          variant: 'default' as const,
          icon: FileCheck,
          className: 'bg-blue-100 text-blue-700 border-blue-300',
        };
      case 'APPROVED':
        return {
          label: 'Approved',
          variant: 'default' as const,
          icon: CheckCircle2,
          className: 'bg-green-100 text-green-700 border-green-300',
        };
      case 'ARCHIVED':
        return {
          label: 'Archived',
          variant: 'outline' as const,
          icon: Archive,
          className: 'bg-gray-50 text-gray-500 border-gray-200',
        };
      default:
        return {
          label: status,
          variant: 'outline' as const,
          icon: Clock,
          className: '',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`${config.className} ${className}`}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
