'use client';

import { useState, useEffect } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { OrgChartNode } from './org-chart-node';
import { EmployeeDetailsDialog } from './employee-details-dialog';
import type { OrgChartEmployee } from '@/types/org-chart';
import { buildEmployeeTree } from '@/lib/org-chart/tree-builder';
import { Loader2 } from 'lucide-react';

// Helper to get department color based on department ID
function getDepartmentColor(departmentId: string): string {
  // Simple hash function to consistently map department IDs to colors
  const colors = [
    'border-blue-500',
    'border-green-500',
    'border-purple-500',
    'border-orange-500',
    'border-pink-500',
    'border-indigo-500',
    'border-cyan-500',
    'border-emerald-500',
    'border-violet-500',
    'border-rose-500',
  ];

  // Use department ID to generate a consistent index
  let hash = 0;
  for (let i = 0; i < departmentId.length; i++) {
    hash = departmentId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function OrgChart() {
  const [employees, setEmployees] = useState<OrgChartEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<OrgChartEmployee | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch employees from API
  useEffect(() => {
    async function fetchEmployees() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/org-chart');

        if (!response.ok) {
          throw new Error('Failed to fetch organizational chart data');
        }

        const data = await response.json();
        setEmployees(data);

        // Build tree to set initial expanded state
        const tree = buildEmployeeTree(data);
        const initialExpanded = new Set<string>();

        // Auto-expand all root level employees
        tree.forEach((rootEmployee) => {
          initialExpanded.add(rootEmployee.id);

          // Auto-expand their direct reports (one level down)
          if (rootEmployee.directReports && rootEmployee.directReports.length > 0) {
            rootEmployee.directReports.forEach((directReport) => {
              initialExpanded.add(directReport.id);
            });
          }
        });

        setExpandedNodes(initialExpanded);
      } catch (err) {
        console.error('Error fetching org chart data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchEmployees();
  }, []);

  // Handle node expand/collapse
  const handleToggleExpand = (employeeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  };

  // Handle viewing employee details
  const handleViewDetails = (employee: OrgChartEmployee) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  // Recursive function to render tree nodes
  const renderTreeNode = (employee: OrgChartEmployee): React.ReactNode => {
    const hasChildren = employee.directReports && employee.directReports.length > 0;
    const isExpanded = expandedNodes.has(employee.id);
    const shouldShowChildren = hasChildren && isExpanded;
    const departmentColor = employee.departmentId ? getDepartmentColor(employee.departmentId) : undefined;

    return (
      <TreeNode
        key={employee.id}
        label={
          <OrgChartNode
            employee={employee}
            onViewDetails={handleViewDetails}
            isExpanded={isExpanded}
            onToggleExpand={() => handleToggleExpand(employee.id)}
            hasChildren={hasChildren}
            departmentColor={departmentColor}
          />
        }
      >
        {shouldShowChildren &&
          employee.directReports!.map((child) => renderTreeNode(child))}
      </TreeNode>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading organizational chart...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-semibold mb-2">Error Loading Chart</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Build tree structure
  const tree = buildEmployeeTree(employees);

  // Empty state
  if (tree.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No active employees found</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full overflow-auto p-8">
        <div className="flex justify-center">
          <Tree
            lineWidth="2px"
            lineColor="#cbd5e1"
            lineBorderRadius="10px"
            label={<div className="text-center text-sm text-muted-foreground mb-8">Organization</div>}
          >
            {tree.map((rootEmployee) => renderTreeNode(rootEmployee))}
          </Tree>
        </div>
      </div>

      {/* Employee Details Dialog */}
      <EmployeeDetailsDialog
        employee={selectedEmployee}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
