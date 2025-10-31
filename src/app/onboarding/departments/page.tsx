'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

interface Department {
  name: string;
  description: string;
}

export default function DepartmentsOnboardingPage() {
  const [departments, setDepartments] = useState<Department[]>([
    { name: '', description: '' }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function addDepartment() {
    setDepartments([...departments, { name: '', description: '' }]);
  }

  function removeDepartment(index: number) {
    if (departments.length > 1) {
      setDepartments(departments.filter((_, i) => i !== index));
    }
  }

  function updateDepartment(index: number, field: keyof Department, value: string) {
    const updated = [...departments];
    updated[index][field] = value;
    setDepartments(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate at least one department with a name
    const validDepartments = departments.filter(d => d.name.trim() !== '');
    if (validDepartments.length === 0) {
      setError('Please add at least one department');
      setLoading(false);
      return;
    }

    try {
      // Create all departments
      const promises = validDepartments.map(dept =>
        fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dept),
        })
      );

      const responses = await Promise.all(promises);
      const failedResponse = responses.find(r => !r.ok);

      if (failedResponse) {
        const data = await failedResponse.json();
        setError(data.error || 'Failed to create departments');
        setLoading(false);
      } else {
        router.push('/onboarding/employee');
      }
    } catch (error) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-2xl space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold">Add departments</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Step 2 of 3: Create departments for your organization
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {departments.map((dept, index) => (
              <div key={index} className="relative rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-4">
                    <div>
                      <label htmlFor={`dept-name-${index}`} className="block text-sm font-medium">
                        Department Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id={`dept-name-${index}`}
                        type="text"
                        value={dept.name}
                        onChange={(e) => updateDepartment(index, 'name', e.target.value)}
                        required={index === 0}
                        className="mt-1"
                        placeholder="Engineering, Sales, Marketing, etc."
                      />
                    </div>

                    <div>
                      <label htmlFor={`dept-desc-${index}`} className="block text-sm font-medium">
                        Description (Optional)
                      </label>
                      <Textarea
                        id={`dept-desc-${index}`}
                        value={dept.description}
                        onChange={(e) => updateDepartment(index, 'description', e.target.value)}
                        className="mt-1"
                        placeholder="Brief description..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {departments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDepartment(index)}
                      className="ml-4 text-gray-400 hover:text-red-500"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addDepartment}
            className="w-full"
          >
            Add Another Department
          </Button>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/onboarding/organization')}
            >
              Back
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}