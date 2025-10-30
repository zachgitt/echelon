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
