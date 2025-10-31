'use client';

import { useState, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const COMMON_DEPARTMENTS = [
  'Engineering',
  'Sales',
  'Marketing',
  'Product',
  'Design',
  'Finance',
  'HR',
  'Operations',
  'Customer Success',
  'Legal'
];

export default function DepartmentsOnboardingPage() {
  const [departments, setDepartments] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function addDepartment(name: string) {
    const trimmed = name.trim();
    if (trimmed && !departments.includes(trimmed)) {
      setDepartments([...departments, trimmed]);
      setInputValue('');
      setError(null);
    }
  }

  function removeDepartment(name: string) {
    setDepartments(departments.filter(d => d !== name));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addDepartment(inputValue);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Add any pending input
    if (inputValue.trim()) {
      addDepartment(inputValue);
      return; // Let the user see it was added, they can submit again
    }

    if (departments.length === 0) {
      setError('Please add at least one department');
      return;
    }

    setLoading(true);

    try {
      // Create all departments
      const promises = departments.map(name =>
        fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description: '' }),
        })
      );

      const responses = await Promise.all(promises);
      const failedResponse = responses.find(r => !r.ok);

      if (failedResponse) {
        const data = await failedResponse.json();
        setError(data.error || 'Failed to create departments');
        setLoading(false);
      } else {
        router.push('/onboarding/bulk-upload');
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
            Step 2 of 4: Create departments for your organization
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Input field */}
            <div>
              <label htmlFor="department-input" className="block text-sm font-medium mb-2">
                Add departments
              </label>
              <Input
                id="department-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a department name and press Enter..."
                className="w-full"
              />
              <p className="mt-1 text-xs text-gray-500">
                Press Enter or comma to add. Click suggestions below to add quickly.
              </p>
            </div>

            {/* Selected departments as tags */}
            {departments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-4 rounded-lg border bg-gray-50">
                {departments.map((dept) => (
                  <Badge
                    key={dept}
                    variant="secondary"
                    className="text-sm px-3 py-1.5 flex items-center gap-2"
                  >
                    {dept}
                    <button
                      type="button"
                      onClick={() => removeDepartment(dept)}
                      className="hover:text-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Common suggestions */}
            <div>
              <p className="text-sm font-medium mb-2 text-gray-700">
                Common departments:
              </p>
              <div className="flex flex-wrap gap-2">
                {COMMON_DEPARTMENTS.filter(d => !departments.includes(d)).map((dept) => (
                  <Button
                    key={dept}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addDepartment(dept)}
                    className="text-xs"
                  >
                    + {dept}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
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