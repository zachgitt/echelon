'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EmployeeBulkImportForm } from '@/components/employees/employee-bulk-import-form';
import { ArrowRight } from 'lucide-react';

interface Department {
  id: string;
  name: string;
}

export default function BulkUploadOnboardingPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchDepartments() {
      try {
        const response = await fetch('/api/departments');
        if (response.ok) {
          const data = await response.json();
          setDepartments(data);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      } finally {
        setInitialLoading(false);
      }
    }

    fetchDepartments();
  }, []);

  const handleSuccess = () => {
    // Navigate to employee profile step after successful import
    router.push('/onboarding/employee');
  };

  const handleSkip = () => {
    // Navigate to employee profile step when skipped
    router.push('/onboarding/employee');
  };

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-2xl space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold">Bulk upload employees</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Step 3 of 4: Import multiple employees at once (optional)
          </p>
        </div>

        {/* Skip Option Notice */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700 text-center">
            Don&apos;t have employee data ready? You can skip this step and bulk upload employees later from the Employee Directory.
          </p>
        </div>

        {/* Show department count */}
        {departments.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              You have created <span className="font-semibold">{departments.length}</span> department{departments.length !== 1 ? 's' : ''}:{' '}
              <span className="font-medium">{departments.map(d => d.name).join(', ')}</span>
            </p>
            <p className="text-sm text-blue-800 mt-1">
              Your CSV file should reference these department names.
            </p>
          </div>
        )}

        {/* Bulk Import Form */}
        <EmployeeBulkImportForm
          onSuccess={handleSuccess}
          showInstructions={true}
        />

        {/* Navigation */}
        <div className="border-t pt-6">
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/onboarding/departments')}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
            >
              Skip for now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
