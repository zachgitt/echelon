import { OrgChart } from '@/components/org-chart/org-chart';

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
