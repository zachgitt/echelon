'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { OrgChartNode as EmployeeNodeComponent } from './org-chart-node';
import { DepartmentNode } from './department-node';
import { EmployeeDetailsDialog } from './employee-details-dialog';
import { AddDepartmentDialog } from './add-department-dialog';
import { DeleteDepartmentDialog } from './delete-department-dialog';
import type { OrgChartEmployee, OrgChartNode, OrgChartEmployeeNode, OrgChartDepartmentNode, OrgChartDepartment, OrgChartViewMode } from '@/types/org-chart';
import { buildEmployeeTree, buildDepartmentTree, convertDepartmentToNode } from '@/lib/org-chart/tree-builder';
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

interface OrgChartProps {
  viewMode: OrgChartViewMode;
}

export function OrgChart({ viewMode }: OrgChartProps) {
  const [employees, setEmployees] = useState<OrgChartEmployee[]>([]);
  const [departments, setDepartments] = useState<OrgChartDepartment[]>([]);
  const [organizationName, setOrganizationName] = useState<string>('Organization');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<OrgChartEmployee | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Department action states
  const [addDepartmentDialog, setAddDepartmentDialog] = useState<{
    open: boolean;
    parentDepartment: { id: string; name: string } | null;
  }>({ open: false, parentDepartment: null });

  const [deleteDepartmentDialog, setDeleteDepartmentDialog] = useState<{
    open: boolean;
    department: { id: string; name: string; employeeCount: number; subdepartmentCount: number } | null;
  }>({ open: false, department: null });

  // Refs for tracking node positions and transform state
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Fetch data based on view mode
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        if (viewMode === 'employee') {
          // Fetch employee data
          const response = await fetch('/api/org-chart');
          if (!response.ok) {
            throw new Error('Failed to fetch employee data');
          }
          const data = await response.json();
          setOrganizationName(data.organizationName || 'Organization');
          setEmployees(data.employees);

          // Build tree and set initial expanded state
          const tree = buildEmployeeTree(data.employees);
          const initialExpanded = new Set<string>();
          // Auto-expand top-level employees
          tree.forEach((emp) => initialExpanded.add(emp.id));
          setExpandedNodes(initialExpanded);
        } else {
          // Fetch department data
          const response = await fetch('/api/departments-hierarchy');
          if (!response.ok) {
            throw new Error('Failed to fetch department data');
          }
          const data = await response.json();
          setOrganizationName(data.organizationName || 'Organization');

          // Build tree and set initial expanded state
          const tree = buildDepartmentTree(data.departments);
          setDepartments(tree);
          const initialExpanded = new Set<string>();
          // Auto-expand root departments
          tree.forEach((dept) => initialExpanded.add(dept.id));
          setExpandedNodes(initialExpanded);
        }
      } catch (err) {
        console.error('Error fetching org chart data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [viewMode]);


  // Handle node expand/collapse with centering
  const handleToggleExpand = useCallback((employeeId: string) => {
    const nodeElement = nodeRefs.current.get(employeeId);
    if (!nodeElement || !transformRef.current) {
      // Fallback: just toggle without centering
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        if (next.has(employeeId)) {
          next.delete(employeeId);
        } else {
          next.add(employeeId);
        }
        return next;
      });
      return;
    }

    const transformState = transformRef.current.instance?.transformState;

    // If we can't access transform state, just toggle without animation
    if (!transformState) {
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        if (next.has(employeeId)) {
          next.delete(employeeId);
        } else {
          next.add(employeeId);
        }
        return next;
      });
      return;
    }

    // Get the node's current position in viewport coordinates BEFORE expansion
    const rectBefore = nodeElement.getBoundingClientRect();
    const beforeX = rectBefore.left + rectBefore.width / 2;
    const beforeY = rectBefore.top + rectBefore.height / 2;

    // Store current transform values
    const currentX = transformState.positionX;
    const currentY = transformState.positionY;
    const currentScale = transformState.scale;

    // Toggle the expansion state
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });

    // After state update, adjust the viewport to maintain node position
    // We use multiple requestAnimationFrame calls to ensure layout is complete
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const nodeElementAfter = nodeRefs.current.get(employeeId);
          if (!nodeElementAfter || !transformRef.current) return;

          // Get the node's position AFTER the expansion
          const rectAfter = nodeElementAfter.getBoundingClientRect();
          const afterX = rectAfter.left + rectAfter.width / 2;
          const afterY = rectAfter.top + rectAfter.height / 2;

          // Calculate how much the node shifted due to layout change
          const shiftX = afterX - beforeX;
          const shiftY = afterY - beforeY;

          // Compensate for the shift by adjusting the transform with a quick animation
          // A short animation (200ms) makes the correction feel smoother than instant
          transformRef.current.setTransform(
            currentX - shiftX,
            currentY - shiftY,
            currentScale,
            200 // short animation to smooth the correction
          );
        });
      });
    });
  }, []);

  // Handle viewing employee details
  const handleViewDetails = (employee: OrgChartEmployee) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  // Refetch data after mutations
  const refetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (viewMode === 'employee') {
        const response = await fetch('/api/org-chart');
        if (!response.ok) {
          throw new Error('Failed to fetch employee data');
        }
        const data = await response.json();
        setOrganizationName(data.organizationName || 'Organization');
        setEmployees(data.employees);

        const tree = buildEmployeeTree(data.employees);
        const initialExpanded = new Set<string>();
        tree.forEach((emp) => initialExpanded.add(emp.id));
        setExpandedNodes(initialExpanded);
      } else {
        const response = await fetch('/api/departments-hierarchy');
        if (!response.ok) {
          throw new Error('Failed to fetch department data');
        }
        const data = await response.json();
        setOrganizationName(data.organizationName || 'Organization');

        const tree = buildDepartmentTree(data.departments);
        setDepartments(tree);
        const initialExpanded = new Set<string>();
        tree.forEach((dept) => initialExpanded.add(dept.id));
        setExpandedNodes(initialExpanded);
      }
    } catch (err) {
      console.error('Error refetching org chart data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  // Handle add child department
  const handleAddChild = useCallback((departmentId: string, departmentName: string) => {
    setAddDepartmentDialog({
      open: true,
      parentDepartment: { id: departmentId, name: departmentName },
    });
  }, []);

  // Handle delete department
  const handleDeleteDepartment = useCallback((
    departmentId: string,
    departmentName: string,
    employeeCount: number,
    subdepartmentCount: number
  ) => {
    setDeleteDepartmentDialog({
      open: true,
      department: { id: departmentId, name: departmentName, employeeCount, subdepartmentCount },
    });
  }, []);

  // Handle successful department creation
  const handleDepartmentCreated = useCallback(() => {
    refetchData();
  }, [refetchData]);

  // Handle successful department deletion
  const handleDepartmentDeleted = useCallback(() => {
    refetchData();
  }, [refetchData]);

  // Recursive function to render tree nodes (handles both department and employee nodes)
  const renderTreeNode = (node: OrgChartNode): React.ReactNode => {
    const hasChildren = Boolean(node.directReports && node.directReports.length > 0);
    const isExpanded = expandedNodes.has(node.id);
    const shouldShowChildren = hasChildren && isExpanded;

    // Render department node
    if (node.nodeType === 'department') {
      const departmentColor = getDepartmentColor(node.departmentId);

      const nodeLabel = (
        <div
          className={shouldShowChildren ? '' : 'leaf-node'}
          ref={(el) => {
            if (el) {
              nodeRefs.current.set(node.id, el);
            } else {
              nodeRefs.current.delete(node.id);
            }
          }}
        >
          <DepartmentNode
            departmentId={node.departmentId}
            departmentName={node.departmentName}
            employeeCount={node.employeeCount}
            subdepartmentCount={node.subdepartmentCount}
            departmentColor={departmentColor}
            isExpanded={isExpanded}
            onToggleExpand={() => handleToggleExpand(node.id)}
            onAddChild={handleAddChild}
            onDelete={handleDeleteDepartment}
            viewMode={viewMode}
          />
        </div>
      );

      return (
        <TreeNode key={node.id} label={nodeLabel}>
          {shouldShowChildren &&
            node.directReports!.map((child) => renderTreeNode(child))}
        </TreeNode>
      );
    }

    // Render employee node
    const departmentColor = node.departmentId ? getDepartmentColor(node.departmentId) : undefined;

    const nodeLabel = (
      <div
        className={shouldShowChildren ? '' : 'leaf-node'}
        ref={(el) => {
          if (el) {
            nodeRefs.current.set(node.id, el);
          } else {
            nodeRefs.current.delete(node.id);
          }
        }}
      >
        <EmployeeNodeComponent
          employee={node}
          onViewDetails={handleViewDetails}
          isExpanded={isExpanded}
          onToggleExpand={() => handleToggleExpand(node.id)}
          hasChildren={hasChildren}
          departmentColor={departmentColor}
        />
      </div>
    );

    return (
      <TreeNode key={node.id} label={nodeLabel}>
        {shouldShowChildren &&
          node.directReports!.map((child) => renderTreeNode(child))}
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

  // Helper to recursively convert employees to employee nodes
  const convertToEmployeeNode = (emp: OrgChartEmployee): OrgChartEmployeeNode => ({
    ...emp,
    nodeType: 'employee',
    directReports: emp.directReports?.map(convertToEmployeeNode),
  });

  // Build tree based on view mode
  const tree: OrgChartNode[] = viewMode === 'employee'
    ? buildEmployeeTree(employees).map(convertToEmployeeNode)
    : departments.map(convertDepartmentToNode);

  // Empty state
  if (tree.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">
            {viewMode === 'employee'
              ? 'No active employees found'
              : 'No departments found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <TransformWrapper
        ref={transformRef}
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
        {({ zoomIn, zoomOut, resetTransform }) => {
          // Store the ref for use in handleToggleExpand
          return (
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
                    label={<div className="text-center text-lg font-semibold text-muted-foreground mb-8">{organizationName}</div>}
                  >
                    {tree.map((node) => renderTreeNode(node))}
                  </Tree>
                </div>
              </div>
            </TransformComponent>
          </>
          );
        }}
      </TransformWrapper>

      {/* Employee Details Dialog */}
      <EmployeeDetailsDialog
        employee={selectedEmployee}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {/* Add Department Dialog */}
      <AddDepartmentDialog
        open={addDepartmentDialog.open}
        onOpenChange={(open) =>
          setAddDepartmentDialog((prev) => ({ ...prev, open }))
        }
        parentDepartment={addDepartmentDialog.parentDepartment}
        onSuccess={handleDepartmentCreated}
      />

      {/* Delete Department Dialog */}
      <DeleteDepartmentDialog
        open={deleteDepartmentDialog.open}
        onOpenChange={(open) =>
          setDeleteDepartmentDialog((prev) => ({ ...prev, open }))
        }
        department={deleteDepartmentDialog.department}
        onSuccess={handleDepartmentDeleted}
      />
    </>
  );
}
