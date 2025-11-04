import type { OrgChartEmployee, OrgChartNode, OrgChartDepartmentNode, OrgChartEmployeeNode, OrgChartDepartment } from '@/types/org-chart';

/**
 * Transforms a flat array of employees into a hierarchical tree structure
 * based on manager-employee relationships.
 *
 * @param employees - Flat array of employees with managerId references
 * @returns Array of root employees (those without managers) with nested directReports
 */
export function buildEmployeeTree(employees: OrgChartEmployee[]): OrgChartEmployee[] {
  // Create a map for quick lookup of employees by ID
  const employeeMap = new Map<string, OrgChartEmployee>();

  // Initialize all employees in the map with empty directReports arrays
  employees.forEach((employee) => {
    employeeMap.set(employee.id, {
      ...employee,
      directReports: [],
    });
  });

  // Array to store root employees (those without managers)
  const rootEmployees: OrgChartEmployee[] = [];

  // Build the tree by assigning each employee to their manager's directReports
  employees.forEach((employee) => {
    const currentEmployee = employeeMap.get(employee.id)!;

    if (employee.managerId === null) {
      // This is a root employee (no manager)
      rootEmployees.push(currentEmployee);
    } else {
      // Find the manager and add this employee to their directReports
      const manager = employeeMap.get(employee.managerId);
      if (manager) {
        manager.directReports!.push(currentEmployee);
      } else {
        // If manager not found (shouldn't happen with clean data),
        // treat as root employee
        rootEmployees.push(currentEmployee);
      }
    }
  });

  // Sort root employees by name for consistent display
  rootEmployees.sort((a, b) => a.name.localeCompare(b.name));

  // Sort directReports for each employee recursively
  const sortDirectReports = (employee: OrgChartEmployee) => {
    if (employee.directReports && employee.directReports.length > 0) {
      employee.directReports.sort((a, b) => a.name.localeCompare(b.name));
      employee.directReports.forEach(sortDirectReports);
    }
  };

  rootEmployees.forEach(sortDirectReports);

  return rootEmployees;
}

/**
 * Recursively searches for an employee in the tree structure by ID.
 *
 * @param tree - Array of root employees or subtree
 * @param id - Employee ID to search for
 * @returns The employee if found, null otherwise
 */
export function findEmployeeInTree(
  tree: OrgChartEmployee[],
  id: string
): OrgChartEmployee | null {
  for (const employee of tree) {
    // Check if this is the employee we're looking for
    if (employee.id === id) {
      return employee;
    }

    // Recursively search in direct reports
    if (employee.directReports && employee.directReports.length > 0) {
      const found = findEmployeeInTree(employee.directReports, id);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Counts the total number of reports (direct and indirect) for an employee.
 * This includes all levels down the hierarchy.
 *
 * @param employee - The employee to count reports for
 * @returns Total number of direct and indirect reports
 */
export function countTotalReports(employee: OrgChartEmployee): number {
  if (!employee.directReports || employee.directReports.length === 0) {
    return 0;
  }

  // Start with direct reports count
  let total = employee.directReports.length;

  // Add indirect reports recursively
  employee.directReports.forEach((report) => {
    total += countTotalReports(report);
  });

  return total;
}

/**
 * Counts only the direct reports for an employee.
 *
 * @param employee - The employee to count direct reports for
 * @returns Number of direct reports
 */
export function countDirectReports(employee: OrgChartEmployee): number {
  return employee.directReports?.length || 0;
}

/**
 * Transforms a flat array of employees into a grouped hierarchical tree structure
 * with department nodes as the top level, containing employees underneath.
 *
 * @param employees - Flat array of employees with managerId references
 * @returns Array of department nodes with nested employee hierarchies
 */
export function buildGroupedEmployeeTree(employees: OrgChartEmployee[]): OrgChartNode[] {
  // First build the standard employee tree
  const employeeTree = buildEmployeeTree(employees);

  // Group root employees by department
  const departmentGroups = new Map<string, OrgChartEmployee[]>();

  employeeTree.forEach((employee) => {
    const deptId = employee.departmentId || 'no-department';
    const deptName = employee.department?.name || 'No Department';

    if (!departmentGroups.has(deptId)) {
      departmentGroups.set(deptId, []);
    }
    departmentGroups.get(deptId)!.push(employee);
  });

  // Create department nodes with employees as children
  const departmentNodes: OrgChartNode[] = [];

  // Sort departments by name for consistent ordering
  const sortedDepartments = Array.from(departmentGroups.entries()).sort((a, b) => {
    const deptNameA = a[1][0]?.department?.name || 'No Department';
    const deptNameB = b[1][0]?.department?.name || 'No Department';
    return deptNameA.localeCompare(deptNameB);
  });

  sortedDepartments.forEach(([deptId, deptEmployees]) => {
    // Count total employees in this department (including nested reports)
    const totalEmployeeCount = deptEmployees.reduce((count, emp) => {
      return count + 1 + countTotalReports(emp);
    }, 0);

    // Convert employees to OrgChartEmployeeNode type
    const employeeNodes: OrgChartEmployeeNode[] = deptEmployees.map((emp) =>
      convertToEmployeeNode(emp)
    );

    const departmentNode: OrgChartDepartmentNode = {
      nodeType: 'department',
      id: `dept-${deptId}`,
      departmentId: deptId,
      departmentName: deptEmployees[0]?.department?.name || 'No Department',
      employeeCount: totalEmployeeCount,
      directReports: employeeNodes,
    };

    departmentNodes.push(departmentNode);
  });

  return departmentNodes;
}

/**
 * Recursively converts an OrgChartEmployee to an OrgChartEmployeeNode
 *
 * @param employee - Employee to convert
 * @returns Employee node with proper typing
 */
function convertToEmployeeNode(employee: OrgChartEmployee): OrgChartEmployeeNode {
  return {
    ...employee,
    nodeType: 'employee',
    directReports: employee.directReports?.map(convertToEmployeeNode),
  };
}

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
    departmentLeadId?: string | null;
    departmentLead?: {
      id: string;
      name: string;
      title: string;
      email: string;
    } | null;
    employeeCount: number;
  }>
): OrgChartDepartment[] {
  // Create a map for quick lookup
  const deptMap = new Map<string, OrgChartDepartment>();

  // Initialize all departments in the map
  departments.forEach((dept) => {
    deptMap.set(dept.id, {
      ...dept,
      departmentLeadId: dept.departmentLeadId,
      departmentLead: dept.departmentLead,
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
 *
 * @param dept - Department to convert
 * @returns Department node with proper typing for org chart rendering
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
    departmentLead: dept.departmentLead,
    directReports: dept.subdepartments?.map(convertDepartmentToNode),
  };
}
