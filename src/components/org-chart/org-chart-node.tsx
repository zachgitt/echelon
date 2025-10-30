'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
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
        'relative w-64 transition-all hover:shadow-md overflow-hidden',
        'border-l-4 p-0 gap-0',
        departmentColor
      )}
    >
      {/* Main Card Content - Clickable to view details */}
      <div
        className="px-4 py-3 pb-2 cursor-pointer"
        onClick={() => onViewDetails(employee)}
      >
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

      {/* Expandable Footer - Only shown if has children */}
      {hasChildren && (
        <button
          className={cn(
            'w-full py-2.5 border-t flex items-center justify-center gap-1.5',
            'hover:bg-accent/50 transition-colors cursor-pointer',
            'text-xs text-muted-foreground hover:text-foreground'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              <span>Collapse</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              <span>Show {directReportsCount} {directReportsCount === 1 ? 'report' : 'reports'}</span>
            </>
          )}
        </button>
      )}
    </Card>
  );
}