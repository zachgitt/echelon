import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { employees, departments, organizations } from '../../../../db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth/user';

export async function GET() {
  try {
    // Get authenticated user's organization
    const { organizationId } = await getAuthenticatedUser();

    // Fetch all active employees with department information for this organization
    const results = await db
      .select({
        id: employees.id,
        name: employees.name,
        title: employees.title,
        email: employees.email,
        departmentId: employees.departmentId,
        managerId: employees.managerId,
        hireDate: employees.hireDate,
        status: employees.status,
        department: {
          id: departments.id,
          name: departments.name,
        },
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(
        eq(employees.status, 'active'),
        eq(employees.organizationId, organizationId)
      ))
      .orderBy(asc(employees.name));

    // Fetch organization name
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    const organizationName = org?.name || 'Organization';

    return NextResponse.json({
      organizationName,
      employees: results,
    });
  } catch (error) {
    console.error('Error fetching org chart data:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch organizational chart data' },
      { status: 500 }
    );
  }
}
