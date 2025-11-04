'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, ChevronDown, ChevronUp, Plus, Trash2, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DepartmentNodeProps {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  subdepartmentCount?: number;
  departmentLead?: {
    id: string;
    name: string;
    title: string;
    email: string;
  } | null;
  departmentColor?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddChild?: (departmentId: string, departmentName: string) => void;
  onDelete?: (departmentId: string, departmentName: string, employeeCount: number, subdepartmentCount: number) => void;
  viewMode?: 'employee' | 'department';
}

export function DepartmentNode({
  departmentId,
  departmentName,
  employeeCount,
  subdepartmentCount,
  departmentLead,
  departmentColor = 'border-blue-500',
  isExpanded,
  onToggleExpand,
  onAddChild,
  onDelete,
  viewMode = 'employee',
}: DepartmentNodeProps) {
  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddChild?.(departmentId, departmentName);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(departmentId, departmentName, employeeCount, subdepartmentCount || 0);
  };

  const showActions = viewMode === 'department' && (onAddChild || onDelete);

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
        {/* Department Name and Actions */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="font-bold text-base leading-tight truncate">
              {departmentName}
            </div>
          </div>

          {/* Action Buttons */}
          {showActions && (
            <div className="flex gap-1 flex-shrink-0">
              {onAddChild && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleAddChild}
                  title="Add child department"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDelete}
                  title="Delete department"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Department Lead */}
        {departmentLead && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <UserCircle className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">
                {departmentLead.name}
              </div>
              <div className="text-xs truncate">
                {departmentLead.title}
              </div>
            </div>
          </div>
        )}

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Employee Count Badge */}
          <Badge variant="secondary" className="text-sm gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {employeeCount} {employeeCount === 1 ? 'employee' : 'employees'}
          </Badge>

          {/* Subdepartment Count Badge - Only in department view */}
          {viewMode === 'department' && subdepartmentCount !== undefined && subdepartmentCount > 0 && (
            <Badge variant="outline" className="text-sm gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {subdepartmentCount} {subdepartmentCount === 1 ? 'dept' : 'depts'}
            </Badge>
          )}
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
