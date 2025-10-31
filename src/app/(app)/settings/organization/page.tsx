'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { toast } from 'sonner';

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

interface Department {
  id: string;
  name: string;
  description: string | null;
}

export default function OrganizationSettingsPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [originalDepartments, setOriginalDepartments] = useState<Department[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);
  const [deptLoading, setDeptLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch organization data
        const orgResponse = await fetch('/api/organizations');
        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          if (orgData.organization) {
            setName(orgData.organization.name || '');
            setDescription(orgData.organization.description || '');
            setDomain(orgData.organization.domain || '');
          }
        }

        // Fetch departments
        const deptResponse = await fetch('/api/departments');
        if (deptResponse.ok) {
          const deptData = await deptResponse.json();
          setDepartments(deptData || []);
          setOriginalDepartments(deptData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load organization data');
      } finally {
        setInitialLoading(false);
      }
    }

    fetchData();
  }, []);

  function addDepartment(name: string) {
    const trimmed = name.trim();
    if (trimmed && !departments.some(d => d.name === trimmed)) {
      setInputValue('');
      setError(null);
      // Add as a temporary department (will be created on save)
      setDepartments([...departments, {
        id: `temp-${Date.now()}`,
        name: trimmed,
        description: null
      }]);
    }
  }

  function removeDepartment(id: string) {
    setDepartments(departments.filter(d => d.id !== id));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addDepartment(inputValue);
    }
  }

  async function handleSaveOrganization(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOrgLoading(true);

    try {
      const response = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update organization');
        toast.error(data.error || 'Failed to update organization');
      } else {
        toast.success('Organization updated successfully');
      }
    } catch (error) {
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setOrgLoading(false);
    }
  }

  async function handleSaveDepartments() {
    setError(null);
    setDeptLoading(true);

    try {
      // Separate new departments (temp IDs) from existing ones
      const newDepartments = departments.filter(d => d.id.startsWith('temp-'));
      const currentDepartmentIds = new Set(
        departments.filter(d => !d.id.startsWith('temp-')).map(d => d.id)
      );

      // Find departments that were deleted (in original but not in current)
      const deletedDepartments = originalDepartments.filter(
        d => !currentDepartmentIds.has(d.id)
      );

      const promises: Promise<Response>[] = [];

      // Create new departments
      newDepartments.forEach(dept => {
        promises.push(
          fetch('/api/departments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: dept.name, description: dept.description }),
          })
        );
      });

      // Delete removed departments
      deletedDepartments.forEach(dept => {
        promises.push(
          fetch(`/api/departments/${dept.id}`, {
            method: 'DELETE',
          })
        );
      });

      if (promises.length > 0) {
        const responses = await Promise.all(promises);
        const failedResponse = responses.find(r => !r.ok);

        if (failedResponse) {
          const data = await failedResponse.json();
          setError(data.error || 'Failed to update departments');
          toast.error(data.error || 'Failed to update departments');
          setDeptLoading(false);
          return;
        }
      }

      toast.success('Departments updated successfully');

      // Refresh departments list
      const deptResponse = await fetch('/api/departments');
      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        setDepartments(deptData || []);
        setOriginalDepartments(deptData || []);
      }
    } catch (error) {
      console.error('Error saving departments:', error);
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setDeptLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Organization Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your organization details and departments
        </p>
      </div>

      {/* Organization Details Section */}
      <div className="rounded-lg border bg-white p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Organization Details</h2>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <form onSubmit={handleSaveOrganization} className="space-y-4">
          <div>
            <label htmlFor="domain" className="block text-sm font-medium mb-1">
              Domain
            </label>
            <Input
              id="domain"
              type="text"
              value={domain}
              disabled
              className="bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-500">
              Domain is fixed and cannot be changed
            </p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Acme Corporation"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description (Optional)
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your organization..."
              rows={4}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={orgLoading}>
              {orgLoading ? 'Saving...' : 'Save Organization'}
            </Button>
          </div>
        </form>
      </div>

      {/* Departments Section */}
      <div className="rounded-lg border bg-white p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Departments</h2>
          <p className="text-sm text-gray-600">
            Add, remove, or modify departments for your organization
          </p>
        </div>

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
                  key={dept.id}
                  variant="secondary"
                  className="text-sm px-3 py-1.5 flex items-center gap-2"
                >
                  {dept.name}
                  <button
                    type="button"
                    onClick={() => removeDepartment(dept.id)}
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
              {COMMON_DEPARTMENTS.filter(d => !departments.some(dept => dept.name === d)).map((dept) => (
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

          <div className="flex justify-end">
            <Button onClick={handleSaveDepartments} disabled={deptLoading}>
              {deptLoading ? 'Saving...' : 'Save Departments'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
