'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmployeeStatusBadge } from './employee-status-badge';
import { Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import type { EmployeeWithRelations } from '@/types/employee';

interface EmployeeTableProps {
  employees: EmployeeWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onEdit: (employee: EmployeeWithRelations) => void;
  onDelete: (employeeId: string) => void;
  isLoading?: boolean;
}

export function EmployeeTable({
  employees,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  isLoading = false,
}: EmployeeTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  const handleDeleteClick = (employeeId: string) => {
    setEmployeeToDelete(employeeId);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;

    setDeletingId(employeeToDelete);
    try {
      await onDelete(employeeToDelete);
    } finally {
      setDeletingId(null);
      setEmployeeToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setEmployeeToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading employees...</div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium">No employees found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or add a new employee
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hire Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">
                  <div>
                    <div>{employee.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {employee.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{employee.title}</TableCell>
                <TableCell>
                  {employee.department?.name || 'N/A'}
                </TableCell>
                <TableCell>
                  {employee.manager?.name || 'No manager'}
                </TableCell>
                <TableCell>
                  <EmployeeStatusBadge status={employee.status} />
                </TableCell>
                <TableCell>
                  {format(new Date(employee.hireDate), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(employee)}
                      disabled={deletingId !== null}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(employee.id)}
                      disabled={
                        deletingId !== null || employee.status === 'terminated'
                      }
                    >
                      <Trash2
                        className={`h-4 w-4 ${
                          deletingId === employee.id ? 'animate-pulse' : ''
                        }`}
                      />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} employees
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="flex items-center px-4 text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={employeeToDelete !== null} onOpenChange={(open) => !open && handleDeleteCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to terminate this employee? This action will
              mark the employee as terminated in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
