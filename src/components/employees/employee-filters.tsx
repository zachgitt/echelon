'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import type { EmployeeStatus } from '@/types/employee';

interface Department {
  id: string;
  name: string;
}

interface EmployeeFiltersProps {
  onFilterChange: (filters: {
    search: string;
    status: EmployeeStatus[];
    departmentId: string[];
  }) => void;
}

export function EmployeeFilters({ onFilterChange }: EmployeeFiltersProps) {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<EmployeeStatus[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Fetch departments for filter
  useEffect(() => {
    fetch('/api/departments')
      .then((res) => res.json())
      .then((data) => setDepartments(data))
      .catch((err) => console.error('Failed to fetch departments:', err));
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({
        search,
        status: selectedStatus,
        departmentId: selectedDepartments,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [search, selectedStatus, selectedDepartments, onFilterChange]);

  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      setSelectedStatus([]);
    } else {
      const status = value as EmployeeStatus;
      setSelectedStatus((prev) =>
        prev.includes(status)
          ? prev.filter((s) => s !== status)
          : [...prev, status]
      );
    }
  };

  const handleDepartmentChange = (value: string) => {
    if (value === 'all') {
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments((prev) =>
        prev.includes(value)
          ? prev.filter((d) => d !== value)
          : [...prev, value]
      );
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedStatus([]);
    setSelectedDepartments([]);
  };

  const hasActiveFilters =
    search || selectedStatus.length > 0 || selectedDepartments.length > 0;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name, email, or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue
              placeholder={
                selectedStatus.length > 0
                  ? `Status (${selectedStatus.length})`
                  : 'All Statuses'
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="on_leave">On Leave</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={handleDepartmentChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue
              placeholder={
                selectedDepartments.length > 0
                  ? `Dept (${selectedDepartments.length})`
                  : 'All Departments'
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-10"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
