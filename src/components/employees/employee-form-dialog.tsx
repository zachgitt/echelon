'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmployeeForm } from './employee-form';
import type { EmployeeFormData, EmployeeWithRelations } from '@/types/employee';

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeWithRelations | null;
  onSuccess: () => void;
  organizationId: string;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
  organizationId,
}: EmployeeFormDialogProps) {
  const isEditMode = !!employee;

  const handleSubmit = async (data: EmployeeFormData) => {
    const url = isEditMode
      ? `/api/employees/${employee.id}`
      : '/api/employees';

    const method = isEditMode ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        organizationId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save employee');
    }

    onOpenChange(false);
    onSuccess();
  };

  const initialData = employee
    ? {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        title: employee.title,
        departmentId: employee.departmentId,
        managerId: employee.managerId,
        hireDate: employee.hireDate.toString(),
        salary: employee.salary,
        status: employee.status,
        organizationId: employee.organizationId,
      }
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Employee' : 'Add New Employee'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the employee information below.'
              : 'Fill in the employee information below.'}
          </DialogDescription>
        </DialogHeader>
        <EmployeeForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
