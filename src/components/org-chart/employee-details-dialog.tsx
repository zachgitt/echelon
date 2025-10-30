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
        <DialogHeader className="space-y-3 pb-2">
          <div>
            <DialogTitle className="text-2xl font-bold pr-8">{employee.name}</DialogTitle>
            <div className="flex items-center justify-between gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <p className="text-base text-muted-foreground">{employee.title}</p>
              </div>
              {/* Status Badge */}
              <Badge
                variant={
                  employee.status === 'active' ? 'default' :
                  employee.status === 'terminated' ? 'destructive' :
                  employee.status === 'on_leave' ? 'outline' :
                  'secondary'
                }
                className={
                  employee.status === 'active' ? 'bg-green-500 text-white pointer-events-none' :
                  employee.status === 'terminated' ? 'bg-red-500 pointer-events-none' :
                  employee.status === 'on_leave' ? 'bg-yellow-500 text-white border-yellow-600 pointer-events-none' :
                  'bg-gray-500 text-white pointer-events-none'
                }
              >
                {employee.status === 'on_leave' ? 'On Leave' :
                 employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Contact Information Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Contact Information
            </h3>

            {/* Email */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <Mail className="h-5 w-5 text-blue-600/70 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground mb-0.5">Email</div>
                <a
                  href={`mailto:${employee.email}`}
                  className="text-sm text-foreground hover:text-primary hover:underline truncate block"
                >
                  {employee.email}
                </a>
              </div>
            </div>
          </div>

          {/* Organization Details Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Organization Details
            </h3>

            <div className="grid gap-3">
              {/* Department */}
              {employee.department && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Building2 className="h-5 w-5 text-purple-600/70 shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-muted-foreground mb-0.5">
                      Department
                    </div>
                    <div className="text-sm text-foreground">{employee.department.name}</div>
                  </div>
                </div>
              )}

              {/* Direct Reports */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Users className="h-5 w-5 text-green-600/70 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground mb-0.5">
                    Direct Reports
                  </div>
                  <div className="text-sm text-foreground">
                    {directReportsCount === 0
                      ? 'No direct reports'
                      : `${directReportsCount} ${directReportsCount === 1 ? 'person' : 'people'}`}
                  </div>
                </div>
              </div>

              {/* Hire Date */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Calendar className="h-5 w-5 text-orange-600/70 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground mb-0.5">
                    Hire Date
                  </div>
                  <div className="text-sm text-foreground">
                    {format(new Date(employee.hireDate), 'MMMM d, yyyy')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
