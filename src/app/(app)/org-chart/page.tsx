'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { OrgChartViewMode } from '@/types/org-chart';

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

export default function OrgChartPage() {
  const [viewMode, setViewMode] = useState<OrgChartViewMode>('employee');

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Page Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Organizational Chart</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {viewMode === 'employee'
                ? "Visualize your organization's reporting structure"
                : "Visualize your organization's department hierarchy"}
            </p>
          </div>

          {/* View Mode Toggle */}
          <RadioGroup
            value={viewMode}
            onValueChange={(value) => setViewMode(value as OrgChartViewMode)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="employee" id="employee" />
              <Label htmlFor="employee" className="cursor-pointer">
                Employee View
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="department" id="department" />
              <Label htmlFor="department" className="cursor-pointer">
                Department View
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 relative overflow-hidden">
        <OrgChart viewMode={viewMode} />
      </div>
    </div>
  );
}
