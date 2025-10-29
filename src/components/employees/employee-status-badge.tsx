import { Badge } from '@/components/ui/badge';
import type { EmployeeStatus } from '@/types/employee';

interface EmployeeStatusBadgeProps {
  status: EmployeeStatus;
}

const statusConfig = {
  active: {
    label: 'Active',
    variant: 'default' as const,
    className: 'bg-green-500 hover:bg-green-600',
  },
  inactive: {
    label: 'Inactive',
    variant: 'secondary' as const,
    className: 'bg-gray-500 hover:bg-gray-600',
  },
  on_leave: {
    label: 'On Leave',
    variant: 'outline' as const,
    className: 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600',
  },
  terminated: {
    label: 'Terminated',
    variant: 'destructive' as const,
    className: 'bg-red-500 hover:bg-red-600',
  },
};

export function EmployeeStatusBadge({ status }: EmployeeStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
