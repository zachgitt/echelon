'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { EmployeeFilters } from '@/components/employees/employee-filters';
import { EmployeeTable } from '@/components/employees/employee-table';
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog';
import { Plus } from 'lucide-react';
import type {
  EmployeeWithRelations,
  EmployeesListResponse,
  EmployeeStatus,
} from '@/types/employee';

// TODO: Get organization ID from auth context or user session
const MOCK_ORGANIZATION_ID = '6d35c52f-678e-42b7-a66d-6201cd8a8272';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeWithRelations[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    status: null as EmployeeStatus | null,
    departmentId: null as string | null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeWithRelations | null>(null);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '25',
      });

      if (filters.search) {
        params.append('search', filters.search);
      }

      if (filters.status) {
        params.append('status', filters.status);
      }

      if (filters.departmentId) {
        params.append('departmentId', filters.departmentId);
      }

      const response = await fetch(`/api/employees?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      const data: EmployeesListResponse = await response.json();
      setEmployees(data.employees);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, filters.search, filters.status, filters.departmentId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleFilterChange = useCallback((newFilters: {
    search: string;
    status: EmployeeStatus | null;
    departmentId: string | null;
  }) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on filter change
  }, []);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setIsDialogOpen(true);
  };

  const handleEditEmployee = (employee: EmployeeWithRelations) => {
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete employee');
      }

      // Refresh the list
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee. Please try again.');
    }
  };

  const handleFormSuccess = () => {
    fetchEmployees();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Employee Directory
          </h1>
          <p className="text-muted-foreground">
            Manage your organization&apos;s employees
          </p>
        </div>
        <Button onClick={handleAddEmployee}>
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <div className="mb-6">
        <EmployeeFilters onFilterChange={handleFilterChange} />
      </div>

      <div className="flex-1 overflow-auto">
        <EmployeeTable
          employees={employees}
          pagination={pagination}
          onPageChange={handlePageChange}
          onEdit={handleEditEmployee}
          onDelete={handleDeleteEmployee}
          isLoading={isLoading}
        />
      </div>

      <EmployeeFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        employee={selectedEmployee}
        onSuccess={handleFormSuccess}
        organizationId={MOCK_ORGANIZATION_ID}
      />
    </div>
  );
}
