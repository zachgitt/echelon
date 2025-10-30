import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/audit/queries';
import type { AuditLogFilters } from '@/lib/audit/queries';
import type { AuditAction, AuditEntityType } from '@/lib/audit/service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters from query params
    const filters: AuditLogFilters = {
      organizationId: searchParams.get('organizationId') || undefined,
      entityType: searchParams.getAll('entityType') as AuditEntityType[],
      entityId: searchParams.get('entityId') || undefined,
      action: searchParams.getAll('action') as AuditAction[],
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined,
      endDate: searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    };

    const result = await getAuditLogs(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
