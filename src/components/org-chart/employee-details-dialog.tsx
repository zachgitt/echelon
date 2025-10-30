'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { OrgChartEmployee } from '@/types/org-chart';
import { Mail, Calendar, Users, Briefcase, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeDetailsDialogProps {
  employee: OrgChartEmployee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeDetailsDialog({
  employee,
  open,
  onOpenChange,
}: EmployeeDetailsDialogProps) {
  if (!employee) return null;

  const directReportsCount = employee.directReports?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{employee.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="flex items-start gap-3">
            <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">Title</div>
              <div className="text-base">{employee.title}</div>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">Email</div>
              <a
                href={`mailto:${employee.email}`}
                className="text-base text-primary hover:underline"
              >
                {employee.email}
              </a>
            </div>
          </div>

          {/* Department */}
          {employee.department && (
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Department
                </div>
                <div className="text-base">{employee.department.name}</div>
              </div>
            </div>
          )}

          {/* Hire Date */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Hire Date
              </div>
              <div className="text-base">
                {format(new Date(employee.hireDate), 'MMMM d, yyyy')}
              </div>
            </div>
          </div>

          {/* Direct Reports Count */}
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Direct Reports
              </div>
              <div className="text-base">
                {directReportsCount === 0
                  ? 'No direct reports'
                  : `${directReportsCount} ${directReportsCount === 1 ? 'person' : 'people'}`}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-start gap-3">
            <div className="h-5 w-5" /> {/* Spacer for alignment */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Status
              </div>
              <Badge
                variant={employee.status === 'active' ? 'default' : 'secondary'}
              >
                {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
