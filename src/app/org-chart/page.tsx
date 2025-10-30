'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

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
  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="border-b bg-background px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">Organizational Chart</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize your organization's structure and reporting relationships
        </p>
      </div>

      {/* Chart Container */}
      <div className="flex-1 overflow-hidden">
        <OrgChart />
      </div>
    </div>
  );
}
