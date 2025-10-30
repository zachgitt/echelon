'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const OrgChart = dynamic(
  () => import('@/components/org-chart/org-chart').then((mod) => ({ default: mod.OrgChart })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading organizational chart...</span>
        </div>
      </div>
    ),
  }
);

interface Department {
  id: string;
  name: string;
}

export default function OrgChartPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  // Fetch departments for filter
  useEffect(() => {
    fetch('/api/departments')
      .then((res) => res.json())
      .then((data) => setDepartments(data))
      .catch((err) => console.error('Failed to fetch departments:', err));
  }, []);

  const handleDepartmentChange = (value: string) => {
    if (value === 'all') {
      setSelectedDepartment(null);
    } else {
      setSelectedDepartment(value);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Page Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Organizational Chart</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize your organization's structure and reporting relationships
            </p>
          </div>

          {/* Department Filter */}
          <Select
            value={selectedDepartment || 'all'}
            onValueChange={handleDepartmentChange}
          >
            <SelectTrigger className="w-[200px]">
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
        </div>
      </div>

      {/* Chart Container - No scrollbars, pan/zoom interface */}
      <div className="flex-1 relative overflow-hidden">
        <OrgChart selectedDepartmentId={selectedDepartment} />
      </div>
    </div>
  );
}
