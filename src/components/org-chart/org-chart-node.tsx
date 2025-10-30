'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import type { OrgChartEmployee } from '@/types/org-chart';
import { cn } from '@/lib/utils';

interface OrgChartNodeProps {
  employee: OrgChartEmployee;
  onViewDetails: (employee: OrgChartEmployee) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  hasChildren: boolean;
  departmentColor?: string;
}

export function OrgChartNode({
  employee,
  onViewDetails,
  isExpanded,
  onToggleExpand,
  hasChildren,
  departmentColor = 'border-blue-500',
}: OrgChartNodeProps) {
  const directReportsCount = employee.directReports?.length || 0;

  return (
    <Card
      className={cn(
        'relative w-64 cursor-pointer transition-all hover:shadow-md',
        'border-l-4 py-3 gap-2',
        departmentColor
      )}
      onClick={() => onViewDetails(employee)}
    >
      <div className="px-4">
        {/* Employee Name */}
        <div className="font-semibold text-sm leading-tight mb-1">
          {employee.name}
        </div>

        {/* Employee Title */}
        <div className="text-xs text-muted-foreground mb-2">
          {employee.title}
        </div>

        {/* Department & Reports Badge Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Department Badge */}
          {employee.department && (
            <Badge variant="secondary" className="text-xs">
              {employee.department.name}
            </Badge>
          )}

          {/* Direct Reports Badge */}
          {directReportsCount > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Users className="h-3 w-3" />
              {directReportsCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Expand/Collapse Button */}
      {hasChildren && (
        <button
          className={cn(
            'absolute -bottom-3 left-1/2 -translate-x-1/2',
            'bg-background border rounded-full p-1',
            'hover:bg-accent transition-colors',
            'z-10'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      )}
    </Card>
  );
}