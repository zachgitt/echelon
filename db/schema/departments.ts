import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { employees } from './employees';

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),

  // Self-referential parent department relationship (nullable for root departments)
  parentDepartmentId: uuid('parent_department_id').references((): any => departments.id, {
    onDelete: 'set null'
  }),

  // Department lead (employee who manages this department)
  departmentLeadId: uuid('department_lead_id').references((): any => employees.id, {
    onDelete: 'set null'
  }),

  // Link to organization
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
