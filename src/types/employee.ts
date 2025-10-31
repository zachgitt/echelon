import { employees, departments } from '../../db/schema';

// Infer types from schema
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Department = typeof departments.$inferSelect;

// Employee with relationships for display
export interface EmployeeWithRelations extends Employee {
  department: Pick<Department, 'id' | 'name'> | null;
  manager: Pick<Employee, 'id' | 'name'> | null;
}

// API response types
export interface EmployeesListResponse {
  employees: EmployeeWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Filter and sort types
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';

export interface EmployeeFilters {
  search?: string;
  status?: EmployeeStatus[];
  departmentId?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'title' | 'hireDate' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// Form types
export interface EmployeeFormData {
  name: string;
  email: string;
  title: string;
  departmentId: string;
  managerId?: string | null;
  hireDate: string;
  salary?: string | null;
  status: EmployeeStatus;
  organizationId: string;
}

// Bulk import types
export interface EmployeeCSVRow {
  name: string;
  email: string;
  title: string;
  departmentName: string;
  managerEmail?: string;
  hireDate: string;
  salary?: string;
  status: string;
}

export interface EmployeeBulkImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface EmployeeBulkImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: EmployeeBulkImportError[];
  employees?: Employee[];
}
