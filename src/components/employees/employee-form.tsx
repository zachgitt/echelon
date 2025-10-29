'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EmployeeFormData, EmployeeStatus } from '@/types/employee';

interface Department {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  name: string;
  title: string;
}

interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormData> & { id?: string };
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  onCancel: () => void;
}

export function EmployeeForm({
  initialData,
  onSubmit,
  onCancel,
}: EmployeeFormProps) {
  const isEditMode = !!initialData?.id;

  const [formData, setFormData] = useState<EmployeeFormData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    title: initialData?.title || '',
    departmentId: initialData?.departmentId || '',
    managerId: initialData?.managerId || null,
    hireDate: initialData?.hireDate
      ? new Date(initialData.hireDate).toISOString().split('T')[0]
      : '',
    salary: initialData?.salary || null,
    status: initialData?.status || 'active',
    organizationId: initialData?.organizationId || '',
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch departments and managers
  useEffect(() => {
    Promise.all([
      fetch('/api/departments').then((res) => res.json()),
      fetch('/api/managers').then((res) => res.json()),
    ])
      .then(([depts, mgrs]) => {
        setDepartments(depts);
        // Filter out current employee from managers list in edit mode
        setManagers(
          isEditMode
            ? mgrs.filter((m: Manager) => m.id !== initialData?.id)
            : mgrs
        );
      })
      .catch((err) => console.error('Failed to fetch form data:', err));
  }, [isEditMode, initialData?.id]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 2) {
      newErrors.title = 'Title must be at least 2 characters';
    }

    if (!formData.departmentId) {
      newErrors.departmentId = 'Department is required';
    }

    if (!formData.hireDate) {
      newErrors.hireDate = 'Hire date is required';
    } else if (new Date(formData.hireDate) > new Date()) {
      newErrors.hireDate = 'Hire date cannot be in the future';
    }

    if (formData.salary && parseFloat(formData.salary) < 0) {
      newErrors.salary = 'Salary must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error: any) {
      if (error.message) {
        setErrors({ form: error.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof EmployeeFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.form && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {errors.form}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="John Doe"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="john@company.com"
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">
            Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Software Engineer"
          />
          {errors.title && (
            <p className="text-sm text-red-500">{errors.title}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="departmentId">
            Department <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.departmentId}
            onValueChange={(value) => handleChange('departmentId', value)}
          >
            <SelectTrigger id="departmentId">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.departmentId && (
            <p className="text-sm text-red-500">{errors.departmentId}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="managerId">Manager</Label>
          <Select
            value={formData.managerId || 'none'}
            onValueChange={(value) =>
              handleChange('managerId', value === 'none' ? null : value)
            }
          >
            <SelectTrigger id="managerId">
              <SelectValue placeholder="Select manager (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No manager</SelectItem>
              {managers.map((manager) => (
                <SelectItem key={manager.id} value={manager.id}>
                  {manager.name} - {manager.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hireDate">
            Hire Date <span className="text-red-500">*</span>
          </Label>
          <Input
            id="hireDate"
            type="date"
            value={formData.hireDate}
            onChange={(e) => handleChange('hireDate', e.target.value)}
          />
          {errors.hireDate && (
            <p className="text-sm text-red-500">{errors.hireDate}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="salary">Salary</Label>
          <Input
            id="salary"
            type="number"
            step="0.01"
            value={formData.salary || ''}
            onChange={(e) =>
              handleChange('salary', e.target.value || null)
            }
            placeholder="75000.00"
          />
          {errors.salary && (
            <p className="text-sm text-red-500">{errors.salary}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">
            Status <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              handleChange('status', value as EmployeeStatus)
            }
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Saving...'
            : isEditMode
            ? 'Update Employee'
            : 'Create Employee'}
        </Button>
      </div>
    </form>
  );
}
