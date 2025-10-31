'use client';

import { AuditLogList } from '@/components/audit-log/audit-log-list';

// TODO: Get organization ID from auth context or user session
const MOCK_ORGANIZATION_ID = '6d35c52f-678e-42b7-a66d-6201cd8a8272';

export default function AuditLogPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Track changes and activity across the system
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <AuditLogList organizationId={MOCK_ORGANIZATION_ID} />
      </div>
    </div>
  );
}
