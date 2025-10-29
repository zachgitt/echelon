import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),

  // Link to organization
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
