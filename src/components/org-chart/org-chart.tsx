'use client';

import { useState, useEffect } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { OrgChartNode } from './org-chart-node';
import { EmployeeDetailsDialog } from './employee-details-dialog';
import type { OrgChartEmployee } from '@/types/org-chart';
import { buildEmployeeTree } from '@/lib/org-chart/tree-builder';
import { Loader2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    const hasChildren = Boolean(employee.directReports && employee.directReports.length > 0);
    const isExpanded = expandedNodes.has(employee.id);
    const shouldShowChildren = hasChildren && isExpanded;
    const departmentColor = employee.departmentId ? getDepartmentColor(employee.departmentId) : undefined;

    const nodeLabel = (
      <div className={shouldShowChildren ? '' : 'leaf-node'}>
        <OrgChartNode
          employee={employee}
          onViewDetails={handleViewDetails}
          isExpanded={isExpanded}
          onToggleExpand={() => handleToggleExpand(employee.id)}
          hasChildren={hasChildren}
          departmentColor={departmentColor}
        />
      </div>
    );

    return (
      <TreeNode key={employee.id} label={nodeLabel}>
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
      <TransformWrapper
        initialScale={0.8}
        initialPositionX={200}
        initialPositionY={100}
        minScale={0.3}
        maxScale={3}
        centerOnInit={true}
        centerZoomedOut={false}
        disablePadding={false}
        limitToBounds={false}
        wheel={{ step: 0.2 }}
        doubleClick={{ disabled: false, mode: 'zoomIn', step: 0.5 }}
        panning={{
          velocityDisabled: false,
          excluded: ['input', 'textarea', 'select', 'button', 'a']
        }}
        zoomAnimation={{ animationType: 'easeOut', animationTime: 200 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <Button
                onClick={() => zoomIn()}
                size="icon"
                variant="outline"
                className="bg-background shadow-md"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => zoomOut()}
                size="icon"
                variant="outline"
                className="bg-background shadow-md"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => resetTransform()}
                size="icon"
                variant="outline"
                className="bg-background shadow-md"
                title="Reset View"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Pan/Zoom Canvas */}
            <TransformComponent
              wrapperClass="w-full h-full"
              wrapperStyle={{
                width: '100%',
                height: '100%',
                cursor: 'grab'
              }}
            >
              <div className="p-8">
                <div className="inline-block">
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
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Employee Details Dialog */}
      <EmployeeDetailsDialog
        employee={selectedEmployee}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
