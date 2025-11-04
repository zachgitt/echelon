'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DeleteDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: {
    id: string;
    name: string;
    employeeCount: number;
    subdepartmentCount: number;
  } | null;
  onSuccess: () => void;
}

export function DeleteDepartmentDialog({
  open,
  onOpenChange,
  department,
  onSuccess,
}: DeleteDepartmentDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!department) return;

    setError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/departments/${department.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete department');
      }

      // Reset and close
      setConfirmText('');
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isDeleting) {
      setConfirmText('');
      setError(null);
    }
    onOpenChange(open);
  };

  if (!department) return null;

  const hasSubdepartments = department.subdepartmentCount > 0;
  const hasEmployees = department.employeeCount > 0;
  const canDelete = !hasEmployees;
  const isConfirmed = confirmText === department.name;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Department
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the department.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning: Has Employees */}
          {hasEmployees && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Cannot delete this department.</strong>
                <br />
                There {department.employeeCount === 1 ? 'is' : 'are'}{' '}
                {department.employeeCount}{' '}
                {department.employeeCount === 1 ? 'employee' : 'employees'} assigned to this
                department. Please reassign or remove all employees before deleting.
              </AlertDescription>
            </Alert>
          )}

          {/* Warning: Has Subdepartments */}
          {!hasEmployees && hasSubdepartments && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This department has {department.subdepartmentCount}{' '}
                {department.subdepartmentCount === 1 ? 'subdepartment' : 'subdepartments'}.
                <br />
                {department.subdepartmentCount === 1 ? 'It' : 'They'} will become root-level
                {department.subdepartmentCount === 1 ? ' department' : ' departments'} after
                deletion.
              </AlertDescription>
            </Alert>
          )}

          {/* Department Info */}
          <div className="rounded-md border p-4 space-y-2">
            <div>
              <span className="text-sm font-medium">Department:</span>
              <div className="font-semibold">{department.name}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              <div>Employees: {department.employeeCount}</div>
              <div>Subdepartments: {department.subdepartmentCount}</div>
            </div>
          </div>

          {/* Confirmation Input */}
          {canDelete && (
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <span className="font-mono font-semibold">{department.name}</span> to
                confirm
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={department.name}
                disabled={isDeleting}
                autoComplete="off"
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || !isConfirmed || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Department'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
