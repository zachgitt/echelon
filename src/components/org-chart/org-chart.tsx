'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { OrgChartNode as EmployeeNodeComponent } from './org-chart-node';
import { DepartmentNode } from './department-node';
import { EmployeeDetailsDialog } from './employee-details-dialog';
import type { OrgChartEmployee, OrgChartNode, OrgChartEmployeeNode, OrgChartDepartmentNode } from '@/types/org-chart';
import { buildGroupedEmployeeTree } from '@/lib/org-chart/tree-builder';
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
  selectedDepartmentId?: string | null;
}

export function OrgChart({ selectedDepartmentId }: OrgChartProps) {
  const [employees, setEmployees] = useState<OrgChartEmployee[]>([]);
  const [organizationName, setOrganizationName] = useState<string>('Organization');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<OrgChartEmployee | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Refs for tracking node positions and transform state
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Track previous department filter to detect changes
  const prevDepartmentIdRef = useRef<string | null | undefined>(selectedDepartmentId);

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
        setOrganizationName(data.organizationName || 'Organization');
        setEmployees(data.employees);

        // Build grouped tree to set initial expanded state
        const tree = buildGroupedEmployeeTree(data.employees);
        const initialExpanded = new Set<string>();

        // Auto-expand all department nodes and their top-level employees
        tree.forEach((node) => {
          if (node.nodeType === 'department') {
            // Expand the department node
            initialExpanded.add(node.id);

            // Auto-expand all top-level employees in this department
            node.directReports?.forEach((employeeNode) => {
              if (employeeNode.nodeType === 'employee') {
                initialExpanded.add(employeeNode.id);
              }
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

  // Recenter view when department filter changes
  useEffect(() => {
    // Check if the department filter actually changed
    if (prevDepartmentIdRef.current !== selectedDepartmentId && transformRef.current) {
      // Use requestAnimationFrame to ensure the DOM has updated with the filtered tree
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Reset transform to initial state and recenter content
          transformRef.current?.resetTransform();
          // Additional centering call to ensure proper centering with new content size
          requestAnimationFrame(() => {
            if (transformRef.current?.instance) {
              transformRef.current.centerView(0.8, 200);
            }
          });
        });
      });
    }
    // Update the ref to track the current value
    prevDepartmentIdRef.current = selectedDepartmentId;
  }, [selectedDepartmentId]);

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
            departmentName={node.departmentName}
            employeeCount={node.employeeCount}
            departmentColor={departmentColor}
            isExpanded={isExpanded}
            onToggleExpand={() => handleToggleExpand(node.id)}
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

  // Filter employees by selected department if applicable
  const filteredEmployees = selectedDepartmentId
    ? employees.filter((emp) => emp.departmentId === selectedDepartmentId)
    : employees;

  // Build grouped tree structure
  const tree = buildGroupedEmployeeTree(filteredEmployees);

  // Empty state
  if (tree.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">
            {selectedDepartmentId
              ? 'No active employees found in this department'
              : 'No active employees found'}
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
    </>
  );
}
