import { db } from '@/lib/db';
import { auditLogs } from '../../../db/schema';

export type AuditAction = 'created' | 'updated' | 'deleted';
export type AuditEntityType = 'employee' | 'department' | 'organization';

interface CreateAuditLogParams {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  organizationId: string;
  changedBy?: string;
  changedByName?: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  const {
    entityType,
    entityId,
    action,
    organizationId,
    changedBy,
    changedByName,
    previousValues,
    newValues,
  } = params;

  try {
    const [auditLog] = await db
      .insert(auditLogs)
      .values({
        entityType,
        entityId,
        action,
        organizationId,
        changedBy: changedBy || null,
        changedByName: changedByName || null,
        previousValues: previousValues || null,
        newValues: newValues || null,
      })
      .returning();

    return auditLog;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw - we don't want audit logging failures to break the main operation
    return null;
  }
}

/**
 * Compare two objects and return only the fields that changed
 */
export function getChangedFields(
  previous: Record<string, any>,
  current: Record<string, any>
): { previousValues: Record<string, any>; newValues: Record<string, any> } {
  const previousValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};

  // Check all keys in current object
  for (const key in current) {
    // Skip internal fields and userId (which should never be visible in audit logs)
    if (['id', 'createdAt', 'updatedAt', 'userId', 'organizationId'].includes(key)) {
      continue;
    }

    const prevValue = previous[key];
    const currValue = current[key];

    // Handle null/undefined comparisons
    const prevNormalized = prevValue === undefined ? null : prevValue;
    const currNormalized = currValue === undefined ? null : currValue;

    // Compare values (handle dates, objects, primitives)
    if (!areValuesEqual(prevNormalized, currNormalized)) {
      previousValues[key] = prevNormalized;
      newValues[key] = currNormalized;
    }
  }

  return { previousValues, newValues };
}

/**
 * Deep equality check for values
 */
function areValuesEqual(a: any, b: any): boolean {
  // Handle null/undefined
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;

  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle primitives
  if (typeof a !== 'object' && typeof b !== 'object') {
    return a === b;
  }

  // Handle objects/arrays
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  return false;
}

/**
 * Format field names for display
 */
export function formatFieldName(fieldName: string): string {
  const fieldNameMap: Record<string, string> = {
    name: 'Name',
    email: 'Email',
    title: 'Title',
    departmentId: 'Department',
    managerId: 'Manager',
    hireDate: 'Hire Date',
    salary: 'Salary',
    status: 'Status',
    organizationId: 'Organization',
  };

  return fieldNameMap[fieldName] || fieldName;
}

/**
 * Format field values for display
 */
export function formatFieldValue(value: any): string {
  if (value === null || value === undefined) {
    return 'None';
  }

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'string') {
    return value;
  }

  // For objects, try to extract meaningful value
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}
