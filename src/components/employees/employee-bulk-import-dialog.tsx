'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmployeeBulkImportForm } from './employee-bulk-import-form';

interface EmployeeBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EmployeeBulkImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: EmployeeBulkImportDialogProps) {
  const handleSuccess = () => {
    onSuccess();
    // Close dialog after successful import
    setTimeout(() => {
      onOpenChange(false);
    }, 2000);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Employees</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple employees at once
          </DialogDescription>
        </DialogHeader>

        <EmployeeBulkImportForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          showInstructions={true}
        />
      </DialogContent>
    </Dialog>
  );
}
