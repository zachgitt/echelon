import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { employees } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  employeeId: string;
}

/**
 * Gets the authenticated user's organization ID from their employee record
 * @returns AuthenticatedUser object containing userId, organizationId, and employeeId
 * @throws Error if user is not authenticated or employee record not found
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not authenticated');
  }

  // Find employee record linked to this user
  const [employee] = await db
    .select({
      id: employees.id,
      organizationId: employees.organizationId,
    })
    .from(employees)
    .where(eq(employees.userId, user.id))
    .limit(1);

  if (!employee) {
    throw new Error('Employee record not found for authenticated user');
  }

  return {
    userId: user.id,
    organizationId: employee.organizationId,
    employeeId: employee.id,
  };
}
