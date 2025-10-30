import { db } from '@/lib/db';
import { auditLogs, employees, departments } from '../../../db/schema';
import { desc, and, eq, gte, lte, or, ilike } from 'drizzle-orm';
import type { AuditAction, AuditEntityType } from './service';

export interface AuditLogFilters {
  organizationId?: string;
  entityType?: AuditEntityType[];
  entityId?: string;
  action?: AuditAction[];
  startDate?: Date;
  endDate?: Date;
  search?: string; // Search in changed values
  page?: number;
  limit?: number;
}

export interface AuditLogWithDetails {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changedBy: string | null;
  changedByName: string | null;
  changedAt: Date;
  previousValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  organizationId: string;
  // Additional context
  entityName?: string; // Name of the affected entity (e.g., employee name)
}

export async function getAuditLogs(filters: AuditLogFilters) {
  const {
    organizationId,
    entityType,
    entityId,
    action,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 50,
  } = filters;

  // Build where conditions
  const conditions = [];

  if (organizationId) {
    conditions.push(eq(auditLogs.organizationId, organizationId));
  }

  if (entityType && entityType.length > 0) {
    conditions.push(
      or(...entityType.map((type) => eq(auditLogs.entityType, type)))!
    );
  }

  if (entityId) {
    conditions.push(eq(auditLogs.entityId, entityId));
  }

  if (action && action.length > 0) {
    conditions.push(
      or(...action.map((act) => eq(auditLogs.action, act)))!
    );
  }

  if (startDate) {
    conditions.push(gte(auditLogs.changedAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(auditLogs.changedAt, endDate));
  }

  // Execute query with pagination
  const offset = (page - 1) * limit;

  const logs = await db
    .select()
    .from(auditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.changedAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const totalResult = await db
    .select({ count: auditLogs.id })
    .from(auditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const total = totalResult.length;

  // Enrich logs with entity names for employees
  const enrichedLogs: AuditLogWithDetails[] = await Promise.all(
    logs.map(async (log) => {
      let entityName: string | undefined;

      if (log.entityType === 'employee') {
        // Try to get employee name from the log data first (in case employee was deleted)
        if (log.newValues && typeof log.newValues === 'object' && 'name' in log.newValues) {
          entityName = log.newValues.name as string;
        } else if (log.previousValues && typeof log.previousValues === 'object' && 'name' in log.previousValues) {
          entityName = log.previousValues.name as string;
        } else {
          // Otherwise, fetch from database
          const [employee] = await db
            .select({ name: employees.name })
            .from(employees)
            .where(eq(employees.id, log.entityId))
            .limit(1);

          entityName = employee?.name;
        }
      } else if (log.entityType === 'department') {
        if (log.newValues && typeof log.newValues === 'object' && 'name' in log.newValues) {
          entityName = log.newValues.name as string;
        } else if (log.previousValues && typeof log.previousValues === 'object' && 'name' in log.previousValues) {
          entityName = log.previousValues.name as string;
        } else {
          const [department] = await db
            .select({ name: departments.name })
            .from(departments)
            .where(eq(departments.id, log.entityId))
            .limit(1);

          entityName = department?.name;
        }
      }

      return {
        ...log,
        previousValues: log.previousValues as Record<string, any> | null,
        newValues: log.newValues as Record<string, any> | null,
        entityName,
      };
    })
  );

  return {
    logs: enrichedLogs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAuditLogById(id: string) {
  const [log] = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.id, id))
    .limit(1);

  return log || null;
}

export async function getAuditLogsForEntity(
  entityType: AuditEntityType,
  entityId: string,
  limit = 20
) {
  const logs = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId)
      )
    )
    .orderBy(desc(auditLogs.changedAt))
    .limit(limit);

  return logs;
}
