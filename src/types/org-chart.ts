// Org chart specific types

export interface OrgChartEmployee {
  id: string;
  name: string;
  title: string;
  email: string;
  departmentId: string;
  managerId: string | null;
  hireDate: Date;
  status: string;
  department: {
    id: string;
    name: string;
  } | null;
  // Array of employees who report to this employee
  directReports?: OrgChartEmployee[];
}

// Union type for org chart nodes (can be employee or department grouping)
export type OrgChartNode = OrgChartEmployeeNode | OrgChartDepartmentNode;

export interface OrgChartEmployeeNode {
  nodeType: 'employee';
  id: string;
  name: string;
  title: string;
  email: string;
  departmentId: string;
  managerId: string | null;
  hireDate: Date;
  status: string;
  department: {
    id: string;
    name: string;
  } | null;
  directReports?: OrgChartNode[];
}

export interface OrgChartDepartmentNode {
  nodeType: 'department';
  id: string;
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  directReports?: OrgChartNode[];
}
