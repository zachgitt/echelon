'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: ImportError[];
}

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
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const template = `Name,Email,Job Title,Department,Manager Email,Hire Date,Salary,Status
Sarah Johnson,sarah.johnson@company.com,Engineering Director,Engineering,,2024-01-10,150000,active
John Smith,john.smith@company.com,Senior Software Engineer,Engineering,sarah.johnson@company.com,2024-01-15,120000,active
Jane Doe,jane.doe@company.com,Software Engineer,Engineering,sarah.johnson@company.com,2024-02-01,95000,active
Mike Chen,mike.chen@company.com,Product Manager,Product,,2024-02-15,110000,active
Lisa Brown,lisa.brown@company.com,UX Designer,Design,,2024-03-10,105000,active`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employee-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Template downloaded successfully');
  };

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    setFile(selectedFile);
    setImportResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      // Read file content
      const fileContent = await file.text();

      // Send to API
      const response = await fetch('/api/employees/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvContent: fileContent }),
      });

      const result: ImportResult = await response.json();

      if (response.ok && result.success) {
        toast.success(`Successfully imported ${result.imported} employees`);
        setImportResult(result);
        onSuccess();

        // Close dialog after successful import
        setTimeout(() => {
          onOpenChange(false);
          handleReset();
        }, 2000);
      } else {
        toast.error('Import failed. Please review the errors below.');
        setImportResult(result);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to import employees. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              How to Import Employees
            </h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Download the CSV template using the button below</li>
              <li>Open the template in Excel, Google Sheets, or any spreadsheet application</li>
              <li>Fill in your employee data following the example rows</li>
              <li>Save the file as CSV format</li>
              <li>Upload the completed CSV file here</li>
            </ol>
          </div>

          {/* Template Download */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium">Employee Import Template</h4>
              <p className="text-sm text-muted-foreground">
                Download a CSV template with example data
              </p>
            </div>
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* Required Fields Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium mb-2">Required Fields</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">• Name</span> - Full name
              </div>
              <div>
                <span className="font-medium">• Email</span> - Must match org domain
              </div>
              <div>
                <span className="font-medium">• Job Title</span> - Employee's role
              </div>
              <div>
                <span className="font-medium">• Department</span> - Must exist in system
              </div>
              <div>
                <span className="font-medium">• Hire Date</span> - Format: YYYY-MM-DD
              </div>
              <div>
                <span className="font-medium">• Status</span> - active, inactive, on_leave, terminated
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Optional: Manager Email (can be existing employee or in same CSV), Salary (numeric value)
            </p>
          </div>

          {/* File Upload Area */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
              ${file ? 'bg-green-50 border-green-500' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {file ? (
              <div className="space-y-2">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                <p className="font-medium text-green-900">{file.name}</p>
                <p className="text-sm text-green-700">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                >
                  Choose Different File
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="font-medium">
                  Drag and drop your CSV file here
                </p>
                <p className="text-sm text-muted-foreground">or</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                >
                  Browse Files
                </Button>
              </div>
            )}
          </div>

          {/* Import Results */}
          {importResult && (
            <div className={`
              border rounded-lg p-4
              ${importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
            `}>
              <h4 className={`font-semibold mb-2 flex items-center gap-2 ${
                importResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {importResult.success ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Import Successful
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5" />
                    Import Failed
                  </>
                )}
              </h4>

              <div className="text-sm space-y-1 mb-3">
                <p className={importResult.success ? 'text-green-800' : 'text-red-800'}>
                  Imported: {importResult.imported} employees
                </p>
                {importResult.failed > 0 && (
                  <p className="text-red-800">
                    Failed: {importResult.failed} rows
                  </p>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <p className="font-medium text-red-900">Errors:</p>
                  <ul className="space-y-1 text-sm text-red-800">
                    {importResult.errors.map((error, index) => (
                      <li key={index} className="bg-white p-2 rounded border border-red-200">
                        <span className="font-medium">Row {error.row}</span>
                        {' - '}
                        <span className="font-medium">{error.field}:</span>
                        {' '}
                        {error.message}
                        {error.value && (
                          <span className="text-gray-600"> (value: "{error.value}")</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              onOpenChange(false);
              handleReset();
            }}
            variant="outline"
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? 'Importing...' : 'Import Employees'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
