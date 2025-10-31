import { pgTable, uuid, text, timestamp, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { departments } from './departments';

// Employee status enum
export const employeeStatusEnum = pgEnum('employee_status', [
  'active',
  'inactive',
  'on_leave',
  'terminated'
]);

export const employees = pgTable('employees', {
  // Auto-generated UUID - employees can exist independently of auth users
  // Optional: Can be linked to auth.users.id if the employee has a user account
  id: uuid('id').primaryKey().defaultRandom(),

  // Link to Supabase auth.users - nullable because employees can exist without user accounts
  userId: uuid('user_id').unique(),

  // Employee attributes
  name: text('name').notNull(),
  title: text('title').notNull(),

  // Reference to departments table
  departmentId: uuid('department_id')
    .notNull()
    .references(() => departments.id, { onDelete: 'restrict' }),

  // Self-referential manager relationship (nullable for employees without managers)
  managerId: uuid('manager_id').references((): any => employees.id, {
    onDelete: 'set null'
  }),

  // Email address
  email: text('email').notNull().unique(),

  hireDate: timestamp('hire_date').notNull(),
  salary: numeric('salary', { precision: 12, scale: 2 }),

  // Status enum
  status: employeeStatusEnum('status').notNull().default('active'),

  // Link to organization
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
