import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

// Audit log action enum
export const auditActionEnum = pgEnum('audit_action', [
  'created',
  'updated',
  'deleted'
]);

// Entity type enum - can be extended for other entities
export const auditEntityTypeEnum = pgEnum('audit_entity_type', [
  'employee',
  'department',
  'organization'
]);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // What entity was affected
  entityType: auditEntityTypeEnum('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),

  // What action was performed
  action: auditActionEnum('action').notNull(),

  // Who made the change (nullable for now, can be linked to auth later)
  changedBy: uuid('changed_by'),
  changedByName: text('changed_by_name'), // Store name for display

  // When the change happened
  changedAt: timestamp('changed_at').defaultNow().notNull(),

  // Store the actual changes as JSON
  // For 'created': newValues contains all fields
  // For 'updated': previousValues and newValues contain only changed fields
  // For 'deleted': previousValues contains all fields
  previousValues: jsonb('previous_values'),
  newValues: jsonb('new_values'),

  // Organization for multi-tenancy
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
});
