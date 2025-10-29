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
    status: EmployeeStatus | null;
    departmentId: string | null;
  }) => void;
}

export function EmployeeFilters({ onFilterChange }: EmployeeFiltersProps) {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<EmployeeStatus | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
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
        departmentId: selectedDepartment,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [search, selectedStatus, selectedDepartment, onFilterChange]);

  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      setSelectedStatus(null);
    } else {
      setSelectedStatus(value as EmployeeStatus);
    }
  };

  const handleDepartmentChange = (value: string) => {
    if (value === 'all') {
      setSelectedDepartment(null);
    } else {
      setSelectedDepartment(value);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedStatus(null);
    setSelectedDepartment(null);
  };

  const hasActiveFilters =
    search || selectedStatus !== null || selectedDepartment !== null;

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
        <Select
          value={selectedStatus || 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="on_leave">On Leave</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={selectedDepartment || 'all'}
          onValueChange={handleDepartmentChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Departments" />
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
