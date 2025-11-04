# Org Chart Toggle Implementation Plan: Employee vs Department Views

## Overview
Transform the org chart from a single mixed view into two distinct views:
1. **Employee View**: Pure employee hierarchy based on `managerId` (no department grouping)
2. **Department View**: Pure department hierarchy based on `parentDepartmentId`

## Requirements Summary

### 1. Toggle Behavior
- Radio button group to switch between "Employee View" and "Department View"
- Located near the page header

### 2. Department Chart View
- Show department hierarchy based on `parentDepartmentId`
- Display: department name, employee count, subdepartment count
- Clicking expands to show child departments only
- No employee nodes shown

### 3. Employee Chart View
- Pure employee hierarchy based on `managerId`
- Remove department grouping nodes
- Direct manager → employee relationships

### 4. Filters
- Remove the department filter dropdown completely

### 5. APIs
- Keep existing `/api/org-chart` for employee data
- Create new `/api/departments-hierarchy` for department hierarchy

### 6. State Persistence
- No localStorage - view resets on page refresh

---

## Files to Modify

### Frontend Components
- `src/app/(app)/org-chart/page.tsx` - Add radio button toggle, remove filter
- `src/components/org-chart/org-chart.tsx` - Support both view modes
- `src/components/org-chart/department-node.tsx` - Update for pure department view

### Types
- `src/types/org-chart.ts` - Add types for department hierarchy

### Backend APIs
- `src/app/api/org-chart/route.ts` - Keep existing (employee data)
- `src/app/api/departments-hierarchy/route.ts` - **NEW** - Department hierarchy endpoint

### Utilities
- `src/lib/org-chart/tree-builder.ts` - Add `buildDepartmentTree()` function

---

## Implementation Steps

### Step 1: Update Types (`src/types/org-chart.ts`)

**Add new interfaces:**

```typescript
// Department hierarchy types
export interface OrgChartDepartment {
  id: string;
  name: string;
  description: string | null;
  parentDepartmentId: string | null;
  employeeCount: number; // Direct employees in this department
  totalEmployeeCount: number; // Including subdepartments
  subdepartments?: OrgChartDepartment[];
}

// View mode type
export type OrgChartViewMode = 'employee' | 'department';

// Update OrgChartDepartmentNode to support pure department view
export interface OrgChartDepartmentNode {
  nodeType: 'department';
  id: string;
  departmentId: string;
  departmentName: string;
  employeeCount: number; // Direct employees
  subdepartmentCount?: number; // Number of child departments
  directReports?: OrgChartNode[]; // Can contain employees OR departments
}
```

**Update existing:**
- Keep all existing types
- `OrgChartNode` union type already supports both employee and department nodes

---

### Step 2: Create Department Hierarchy API

**File:** `src/app/api/departments-hierarchy/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { departments, employees, organizations } from '../../../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth/user';

export async function GET() {
  try {
    // Get authenticated user's organization
    const { organizationId } = await getAuthenticatedUser();

    // Fetch all departments for this organization
    const depts = await db
      .select({
        id: departments.id,
        name: departments.name,
        description: departments.description,
        parentDepartmentId: departments.parentDepartmentId,
      })
      .from(departments)
      .where(eq(departments.organizationId, organizationId))
      .orderBy(departments.name);

    // Get employee counts per department (only active employees)
    const employeeCounts = await db
      .select({
        departmentId: employees.departmentId,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(employees)
      .where(
        and(
          eq(employees.organizationId, organizationId),
          eq(employees.status, 'active')
        )
      )
      .groupBy(employees.departmentId);

    // Create a map of department ID to employee count
    const countMap = new Map(
      employeeCounts.map((ec) => [ec.departmentId, ec.count])
    );

    // Add employee counts to departments
    const departmentsWithCounts = depts.map((dept) => ({
      ...dept,
      employeeCount: countMap.get(dept.id) || 0,
    }));

    // Fetch organization name
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    const organizationName = org?.name || 'Organization';

    return NextResponse.json({
      organizationName,
      departments: departmentsWithCounts,
    });
  } catch (error) {
    console.error('Error fetching department hierarchy:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch department hierarchy' },
      { status: 500 }
    );
  }
}
```

---

### Step 3: Add Department Tree Builder (`src/lib/org-chart/tree-builder.ts`)

**Add new function:**

```typescript
/**
 * Transforms a flat array of departments into a hierarchical tree structure
 * based on parent-child relationships.
 *
 * @param departments - Flat array of departments with parentDepartmentId references
 * @returns Array of root departments (those without parents) with nested subdepartments
 */
export function buildDepartmentTree(
  departments: Array<{
    id: string;
    name: string;
    description: string | null;
    parentDepartmentId: string | null;
    employeeCount: number;
  }>
): OrgChartDepartment[] {
  // Create a map for quick lookup
  const deptMap = new Map<string, OrgChartDepartment>();

  // Initialize all departments in the map
  departments.forEach((dept) => {
    deptMap.set(dept.id, {
      ...dept,
      totalEmployeeCount: dept.employeeCount,
      subdepartments: [],
    });
  });

  // Array to store root departments
  const rootDepartments: OrgChartDepartment[] = [];

  // Build the tree by assigning each department to its parent
  departments.forEach((dept) => {
    const currentDept = deptMap.get(dept.id)!;

    if (dept.parentDepartmentId === null) {
      // Root department
      rootDepartments.push(currentDept);
    } else {
      // Find parent and add to subdepartments
      const parent = deptMap.get(dept.parentDepartmentId);
      if (parent) {
        parent.subdepartments!.push(currentDept);
      } else {
        // If parent not found, treat as root
        rootDepartments.push(currentDept);
      }
    }
  });

  // Calculate total employee counts recursively
  const calculateTotalEmployees = (dept: OrgChartDepartment): number => {
    let total = dept.employeeCount;
    dept.subdepartments?.forEach((sub) => {
      total += calculateTotalEmployees(sub);
    });
    dept.totalEmployeeCount = total;
    return total;
  };

  rootDepartments.forEach(calculateTotalEmployees);

  // Sort departments alphabetically
  const sortDepartments = (depts: OrgChartDepartment[]) => {
    depts.sort((a, b) => a.name.localeCompare(b.name));
    depts.forEach((dept) => {
      if (dept.subdepartments && dept.subdepartments.length > 0) {
        sortDepartments(dept.subdepartments);
      }
    });
  };

  sortDepartments(rootDepartments);

  return rootDepartments;
}

/**
 * Converts OrgChartDepartment to OrgChartDepartmentNode for rendering
 */
export function convertDepartmentToNode(
  dept: OrgChartDepartment
): OrgChartDepartmentNode {
  return {
    nodeType: 'department',
    id: dept.id,
    departmentId: dept.id,
    departmentName: dept.name,
    employeeCount: dept.totalEmployeeCount,
    subdepartmentCount: dept.subdepartments?.length || 0,
    directReports: dept.subdepartments?.map(convertDepartmentToNode),
  };
}
```

---

### Step 4: Update OrgChart Component (`src/components/org-chart/org-chart.tsx`)

**Key changes:**

1. **Add viewMode prop and state:**
```typescript
interface OrgChartProps {
  viewMode: OrgChartViewMode;
}

export function OrgChart({ viewMode }: OrgChartProps) {
  const [employees, setEmployees] = useState<OrgChartEmployee[]>([]);
  const [departments, setDepartments] = useState<OrgChartDepartment[]>([]);
  // ... rest of state
```

2. **Update data fetching:**
```typescript
useEffect(() => {
  async function fetchData() {
    try {
      setLoading(true);
      setError(null);

      if (viewMode === 'employee') {
        // Fetch employee data
        const response = await fetch('/api/org-chart');
        if (!response.ok) throw new Error('Failed to fetch employee data');
        const data = await response.json();
        setOrganizationName(data.organizationName || 'Organization');
        setEmployees(data.employees);

        // Build tree and set expanded state
        const tree = buildEmployeeTree(data.employees);
        const initialExpanded = new Set<string>();
        // Auto-expand top-level employees
        tree.forEach((emp) => initialExpanded.add(emp.id));
        setExpandedNodes(initialExpanded);
      } else {
        // Fetch department data
        const response = await fetch('/api/departments-hierarchy');
        if (!response.ok) throw new Error('Failed to fetch department data');
        const data = await response.json();
        setOrganizationName(data.organizationName || 'Organization');
        setDepartments(data.departments);

        // Build tree and set expanded state
        const tree = buildDepartmentTree(data.departments);
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
```

3. **Update tree building:**
```typescript
// Build tree based on view mode
const tree = viewMode === 'employee'
  ? buildEmployeeTree(employees).map(convertToEmployeeNode)
  : buildDepartmentTree(departments).map(convertDepartmentToNode);
```

4. **Update renderTreeNode to handle department-only nodes:**
```typescript
// In department view, don't show employee details dialog
const handleViewDetails = (employee: OrgChartEmployee) => {
  if (viewMode === 'employee') {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  }
};
```

5. **Remove filtering logic:**
- Remove `selectedDepartmentId` prop
- Remove `prevDepartmentIdRef` and related useEffect
- Remove employee filtering logic

---

### Step 5: Update Department Node Component (`src/components/org-chart/department-node.tsx`)

**Add props for subdepartment display:**

```typescript
interface DepartmentNodeProps {
  departmentName: string;
  employeeCount: number;
  subdepartmentCount?: number;
  departmentColor?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  viewMode?: 'employee' | 'department'; // Add to distinguish display
}

export function DepartmentNode({
  departmentName,
  employeeCount,
  subdepartmentCount,
  departmentColor = 'border-blue-500',
  isExpanded,
  onToggleExpand,
  viewMode = 'employee',
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
```

---

### Step 6: Update Page Component (`src/app/(app)/org-chart/page.tsx`)

**Replace with:**

```typescript
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { OrgChartViewMode } from '@/types/org-chart';

const OrgChart = dynamic(
  () => import('@/components/org-chart/org-chart').then((mod) => ({ default: mod.OrgChart })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading organizational chart...</span>
        </div>
      </div>
    ),
  }
);

export default function OrgChartPage() {
  const [viewMode, setViewMode] = useState<OrgChartViewMode>('employee');

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Page Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Organizational Chart</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {viewMode === 'employee'
                ? 'Visualize your organization\'s reporting structure'
                : 'Visualize your organization\'s department hierarchy'}
            </p>
          </div>

          {/* View Mode Toggle */}
          <RadioGroup
            value={viewMode}
            onValueChange={(value) => setViewMode(value as OrgChartViewMode)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="employee" id="employee" />
              <Label htmlFor="employee" className="cursor-pointer">
                Employee View
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="department" id="department" />
              <Label htmlFor="department" className="cursor-pointer">
                Department View
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 relative overflow-hidden">
        <OrgChart viewMode={viewMode} />
      </div>
    </div>
  );
}
```

---

### Step 7: Update OrgChart Component Rendering

**Update the renderTreeNode function in org-chart.tsx:**

```typescript
// Recursive function to render tree nodes
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
          subdepartmentCount={node.subdepartmentCount}
          departmentColor={departmentColor}
          isExpanded={isExpanded}
          onToggleExpand={() => handleToggleExpand(node.id)}
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

  // Render employee node (only in employee view)
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
```

---

## Testing Checklist

- [ ] Employee view displays pure employee hierarchy (no department nodes)
- [ ] Department view displays pure department hierarchy (no employee nodes)
- [ ] Radio button toggle switches between views correctly
- [ ] Data fetches correctly for each view
- [ ] Expand/collapse works in both views
- [ ] Department nodes show correct employee counts and subdepartment counts
- [ ] Zoom and pan controls work in both views
- [ ] Empty states display correctly
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Auto-expansion works correctly on initial load

---

## Edge Cases to Handle

1. **Orphaned Employees**: Employees without managers should appear as root nodes in employee view
2. **Orphaned Departments**: Departments without parents should appear as root nodes in department view
3. **Empty Departments**: Departments with 0 employees should still display
4. **No Departments**: Handle case where organization has no departments
5. **No Employees**: Handle case where organization has no employees

---

## Visual Structure Examples

### Employee View
```
Organization
├─ CEO
│  ├─ VP Engineering
│  │  ├─ Engineering Manager
│  │  │  ├─ Senior Engineer
│  │  │  └─ Engineer
│  ├─ VP Sales
│     └─ Sales Manager
```

### Department View
```
Organization
├─ Engineering (50 employees, 2 depts)
│  ├─ Frontend (20 employees)
│  └─ Backend (30 employees)
├─ Sales (15 employees)
```

---

## Implementation Order

1. **Types** - Foundation for everything else
2. **API** - Department hierarchy endpoint
3. **Tree Builder** - Department tree building logic
4. **Component Updates** - org-chart.tsx, department-node.tsx
5. **Page Updates** - org-chart/page.tsx with radio toggle
6. **Testing** - Verify all functionality
7. **Polish** - UI refinements and edge cases

---

## Notes

- Keep existing employee details dialog functionality for employee view
- Department nodes in department view should NOT open employee details
- Remove all references to `selectedDepartmentId` filtering
- The `buildGroupedEmployeeTree` function is no longer needed but can be kept for backward compatibility
- Consider adding a loading skeleton for better UX during view switches
