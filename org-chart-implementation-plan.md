# Organizational Chart Implementation Plan

## Implementation Status
**Core Implementation: COMPLETE ✅**
- Steps 1-8: All completed
- Step 9: Testing & refinement (ongoing)

## Overview
Build an interactive organizational chart feature that visualizes company structure based on employee reporting relationships, with expand/collapse functionality and employee detail viewing.

## Current State

### Database Schema
- Employees table has self-referential `managerId` field (db/schema/employees.ts:28-30)
- Creates tree structure for reporting relationships
- Employees without `managerId` are top-level (CEO, executives)

### Existing Queries
- `getEmployees()` - paginated employee fetching with manager info (src/lib/employees/queries.ts:6-124)
- `getActiveEmployees()` - simple active employee list (src/lib/employees/queries.ts:188-198)
- Already joins manager data, but only immediate manager (not full hierarchy)

### Current Page
- Scaffold exists at src/app/org-chart/page.tsx (just placeholder)

### Tech Stack
- Next.js 16 with App Router
- React 19
- shadcn/ui components (Radix UI)
- Tailwind CSS
- Drizzle ORM with PostgreSQL

## Design Decisions

### Data & Hierarchy
- Fetch ALL employees at once for org chart (no lazy loading initially)
- Show only active employees by default
- Support multiple root nodes (multiple C-suite with no manager)
- Build hierarchy on client-side from flat data

### Visual Design
- **Orientation**: Vertical top-down tree layout
- **Node Design**: Card-based showing:
  - Employee name
  - Title
  - Direct report count badge
  - Department color indicator
- **Styling**: Consistent with shadcn/ui design system

### Interactivity
- Start with top level expanded (show CEO + their direct reports)
- Click node to view employee details in modal dialog
- Expand/collapse branches to navigate hierarchy
- Department color coding for visual organization

### Technical Approach
- Use `react-organizational-chart` library for tree rendering
- Client-side tree building from flat employee array
- Modal dialog for employee details (consistent with existing patterns)

## Implementation Tasks

### 1. Create API Endpoint ✅
**File**: `src/app/api/org-chart/route.ts`

Create endpoint to fetch all active employees with necessary data:
- GET `/api/org-chart`
- Fetch all active employees with department info
- Include manager relationships
- Return flat array (will be transformed client-side)

Query should include:
- id, name, title, email, departmentId, managerId
- department { id, name }
- status

**Completed**: API endpoint created at `src/app/api/org-chart/route.ts`
- Fetches all active employees with department information
- Uses LEFT JOIN for department data
- Orders results alphabetically by employee name
- Follows existing API error handling patterns

### 2. Create Utility Functions ✅
**Files**:
- `src/types/org-chart.ts`
- `src/lib/org-chart/tree-builder.ts`

Build utilities to transform flat employee data into hierarchical tree:

```typescript
// Types needed
interface OrgChartEmployee {
  id: string;
  name: string;
  title: string;
  email: string;
  departmentId: string;
  managerId: string | null;
  department: { id: string; name: string } | null;
  directReports?: OrgChartEmployee[];
}

// Functions needed:
// - buildEmployeeTree(employees: Employee[]): OrgChartEmployee[]
//   Returns array of root employees with nested directReports
// - findEmployeeInTree(tree: OrgChartEmployee[], id: string): OrgChartEmployee | null
// - countTotalReports(employee: OrgChartEmployee): number
```

Algorithm:
1. Create Map of employees by ID
2. Separate root employees (managerId === null)
3. For each employee, attach to parent's directReports array
4. Return root employees with fully nested structure

**Completed**: Tree-builder utilities created
- `OrgChartEmployee` type defined in `src/types/org-chart.ts`
- `buildEmployeeTree()` - transforms flat array to hierarchical tree with sorted results
- `findEmployeeInTree()` - recursive search for employee by ID
- `countTotalReports()` - counts all direct and indirect reports
- `countDirectReports()` - bonus helper for counting only direct reports

### 3. Install Library ✅
**Command**:
```bash
npm install react-organizational-chart
```

This library provides tree layout components with connection lines.

**Completed**: Library installed successfully
- `react-organizational-chart` added to dependencies
- Provides Tree, TreeNode components for hierarchical layout
- Includes connection line rendering out of the box

### 4. Create OrgChartNode Component ✅
**File**: `src/components/org-chart/org-chart-node.tsx`

Individual employee card component:

Features:
- Display employee name, title
- Show direct report count badge if > 0
- Department color indicator (left border or badge)
- Hover effects
- Click handler to view details
- Expand/collapse button if has direct reports

Props:
```typescript
interface OrgChartNodeProps {
  employee: OrgChartEmployee;
  onViewDetails: (employee: OrgChartEmployee) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  hasChildren: boolean;
}
```

Styling:
- Use Card component from shadcn/ui
- Department colors via Tailwind color palette
- Compact design (fits multiple nodes on screen)

**Completed**: OrgChartNode component created
- Compact card design (w-64) with all required information
- Left border color coding for departments (configurable via prop)
- Employee name (semibold), title (muted), and department badge
- Direct reports count badge with Users icon (only shown if > 0)
- Expand/collapse button positioned at bottom center (only shown if has children)
- Hover effects and click handlers for viewing details
- Uses lucide-react icons (ChevronDown, ChevronRight, Users)

### 5. Create EmployeeDetailsDialog Component ✅
**File**: `src/components/org-chart/employee-details-dialog.tsx`

Modal dialog to show employee information:

Display:
- Name, title, email
- Department
- Manager name (if exists)
- Hire date
- Status badge
- Direct report count

Props:
```typescript
interface EmployeeDetailsDialogProps {
  employee: OrgChartEmployee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

Use existing shadcn/ui Dialog component (consistent with employee-table.tsx pattern)

**Completed**: EmployeeDetailsDialog component created
- Clean, organized layout with icon indicators for each field
- Uses lucide-react icons (Mail, Calendar, Users, Briefcase, Building2)
- Employee name in dialog title
- All fields displayed with proper formatting:
  - Title with Briefcase icon
  - Email as clickable mailto: link with Mail icon
  - Department name with Building2 icon
  - Hire date formatted with date-fns (e.g., "January 15, 2023") with Calendar icon
  - Direct reports count with Users icon (shows "No direct reports" or count)
  - Status badge with color coding (active = primary, others = secondary)
- Follows same dialog pattern as employee-form-dialog.tsx
- Responsive max-w-lg sizing

### 6. Build Main OrgChart Component ✅
**File**: `src/components/org-chart/org-chart.tsx`

Main component orchestrating the chart:

State management:
- `employees`: full employee list from API
- `expandedNodes`: Set of expanded employee IDs
- `selectedEmployee`: currently selected for details dialog
- `loading`: API fetch state

Features:
- Fetch employees from API endpoint
- Build tree structure using utility functions
- Manage expand/collapse state
- Render using react-organizational-chart
- Handle node clicks

Initial expand logic:
- Auto-expand all root level employees
- Auto-expand one level down (direct reports of roots)

Props:
```typescript
interface OrgChartProps {
  // Could add filters later (department, search, etc.)
}
```

**Completed**: Main OrgChart component created
- **State management**: employees, loading, error, expandedNodes, selectedEmployee, dialogOpen
- **API integration**: Fetches data from `/api/org-chart` on mount
- **Tree building**: Uses `buildEmployeeTree()` to transform flat data to hierarchy
- **Initial expansion**: Auto-expands root employees and their direct reports
- **Expand/collapse**: Toggle functionality using Set for efficient lookups
- **Rendering**: Recursive `renderTreeNode()` function with react-organizational-chart
  - Tree component with customized line styling (2px, slate color, rounded corners)
  - TreeNode components for each employee
  - Conditional rendering of children based on expand state
- **Department colors**: Inline helper function using consistent hash-based color assignment (10 colors)
- **Loading/Error/Empty states**: Proper UI for all data states with Loader2 icon
- **Employee details**: Opens dialog on node click
- **Layout**: Scrollable container with padding and centered content

### 7. Update Org Chart Page ✅
**File**: `src/app/org-chart/page.tsx`

Replace placeholder with actual org chart:
- Import and render OrgChart component
- Add page header/title
- Add loading state
- Add error handling

Layout:
- Full width container
- Scrollable horizontal and vertical
- Centered content

**Completed**: Org chart page updated
- Replaced placeholder with functional OrgChart component
- **Page Header**: Clean header with title and description, bordered bottom
  - "Organizational Chart" title (text-2xl, semibold)
  - "Visualize your organization's structure and reporting relationships" subtitle
- **Layout**: Flex column with full height
  - Header: Fixed at top with padding and border
  - Chart Container: flex-1 with overflow-hidden for proper scrolling
- **Component Integration**: Imports and renders OrgChart component
- Loading, error, and empty states handled within OrgChart component
- Fully responsive and scrollable layout

### 8. Add Department Color Coding ✅
**File**: Implemented inline in `src/components/org-chart/org-chart.tsx`

Create department color mapping utility:

```typescript
// Generate consistent colors for departments
// Could hash department ID to color
// Or map to Tailwind color palette

export function getDepartmentColor(departmentId: string): string {
  // Return Tailwind color class
}
```

Apply colors to:
- Left border of employee cards
- Optional background tint
- Department badge in details dialog

Use Tailwind colors for consistency:
- blue, green, purple, orange, pink, indigo, etc.

**Completed**: Department color coding implemented
- Hash-based color assignment function implemented inline in OrgChart component
- Uses 10 Tailwind border colors: blue, green, purple, orange, pink, indigo, cyan, emerald, violet, rose
- Consistent color mapping: same department ID always gets same color
- Applied to left border of OrgChartNode cards via `departmentColor` prop
- Simple hash function: iterates through departmentId characters to generate consistent index

### 9. Testing & Refinement

Test cases:
- Single root employee (one CEO)
- Multiple root employees (multiple C-suite)
- Deep hierarchy (5+ levels)
- Wide hierarchy (manager with 10+ reports)
- Empty state (no employees)
- Employee with no reports (leaf node)

Styling refinements:
- Connection line colors and styles
- Card spacing and sizing
- Responsive behavior
- Mobile view considerations
- Loading skeleton states

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── org-chart/
│   │       └── route.ts          # NEW: API endpoint
│   └── org-chart/
│       └── page.tsx               # UPDATE: Use new components
├── components/
│   └── org-chart/                 # NEW: Org chart components
│       ├── org-chart.tsx          # Main chart component
│       ├── org-chart-node.tsx     # Individual employee card
│       └── employee-details-dialog.tsx  # Details modal
├── lib/
│   └── org-chart/                 # NEW: Utilities
│       ├── tree-builder.ts        # Hierarchy building logic
│       └── department-colors.ts   # Color mapping
└── types/
    └── org-chart.ts               # NEW: Org chart specific types (optional)
```

## Implementation Order

1. **API endpoint** - Get data flowing
2. **Tree utilities** - Transform data structure
3. **Install library** - Set up visualization tool
4. **OrgChartNode** - Build basic building block
5. **EmployeeDetailsDialog** - Details viewing
6. **OrgChart component** - Orchestrate everything
7. **Update page** - Wire it all together
8. **Department colors** - Visual polish
9. **Test & refine** - Edge cases and styling

## Future Enhancements (Not in Initial Scope)

- Search/filter employees in chart
- Export chart as image/PDF
- Department view (group by department)
- Lazy loading for very large orgs (100+ employees)
- Drag-and-drop to reassign managers
- Chart zoom controls
- Print-friendly view
- Show employee photos
- Mini-map navigation for large charts
- Breadcrumb navigation
- Link to edit employee from details dialog
