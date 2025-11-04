import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { departments, employees, organizations } from '../../../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth/user';

export async function GET() {
  try {
    // Get authenticated user's organization
    const { organizationId } = await getAuthenticatedUser();

    // Fetch all departments for this organization with department lead info
    const depts = await db
      .select({
        id: departments.id,
        name: departments.name,
        description: departments.description,
        parentDepartmentId: departments.parentDepartmentId,
        departmentLeadId: departments.departmentLeadId,
        departmentLead: {
          id: employees.id,
          name: employees.name,
          title: employees.title,
          email: employees.email,
        },
      })
      .from(departments)
      .leftJoin(employees, eq(departments.departmentLeadId, employees.id))
      .where(eq(departments.organizationId, organizationId))
      .orderBy(departments.name);

    // Get employee counts per department (only active employees)
    const employeeCounts = await db
      .select({
        departmentId: employees.departmentId,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(employees)
      .where(
        and(
          eq(employees.organizationId, organizationId),
          eq(employees.status, 'active')
        )
      )
      .groupBy(employees.departmentId);

    // Create a map of department ID to employee count
    const countMap = new Map(
      employeeCounts.map((ec) => [ec.departmentId, ec.count])
    );

    // Add employee counts to departments
    const departmentsWithCounts = depts.map((dept) => ({
      id: dept.id,
      name: dept.name,
      description: dept.description,
      parentDepartmentId: dept.parentDepartmentId,
      departmentLeadId: dept.departmentLeadId,
      departmentLead: dept.departmentLead?.id ? {
        id: dept.departmentLead.id,
        name: dept.departmentLead.name,
        title: dept.departmentLead.title,
        email: dept.departmentLead.email,
      } : null,
      employeeCount: countMap.get(dept.id) || 0,
    }));

    // Fetch organization name
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    const organizationName = org?.name || 'Organization';

    return NextResponse.json({
      organizationName,
      departments: departmentsWithCounts,
    });
  } catch (error) {
    console.error('Error fetching department hierarchy:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch department hierarchy' },
      { status: 500 }
    );
  }
}
