'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DepartmentNodeProps {
  departmentName: string;
  employeeCount: number;
  departmentColor?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function DepartmentNode({
  departmentName,
  employeeCount,
  departmentColor = 'border-blue-500',
  isExpanded,
  onToggleExpand,
}: DepartmentNodeProps) {
  return (
    <Card
      className={cn(
        'relative w-80 transition-all hover:shadow-lg overflow-hidden cursor-pointer',
        'border-l-4 p-0 gap-0',
        departmentColor
      )}
      onClick={onToggleExpand}
    >
      {/* Department Header */}
      <div className="px-5 py-4">
        {/* Department Name */}
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <div className="font-bold text-base leading-tight">
            {departmentName}
          </div>
        </div>

        {/* Employee Count Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {employeeCount} {employeeCount === 1 ? 'employee' : 'employees'}
          </Badge>
        </div>
      </div>

      {/* Expand/Collapse Footer */}
      <div
        className={cn(
          'w-full py-3 border-t flex items-center justify-center gap-1.5',
          'hover:bg-accent/50 transition-colors',
          'text-sm text-muted-foreground hover:text-foreground'
        )}
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-4 w-4" />
            <span>Collapse</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" />
            <span>Expand</span>
          </>
        )}
      </div>
    </Card>
  );
}
