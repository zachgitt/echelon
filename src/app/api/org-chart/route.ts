import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { employees, departments, organizations } from '../../../../db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  try {
    // Fetch all active employees with department information
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
      .where(eq(employees.status, 'active'))
      .orderBy(asc(employees.name));

    // Fetch organization name (assuming all employees belong to the same organization)
    // We get the organization from the first employee's organizationId
    let organizationName = 'Organization';
    if (results.length > 0) {
      const firstEmployeeOrgId = await db
        .select({ organizationId: employees.organizationId })
        .from(employees)
        .where(eq(employees.id, results[0].id))
        .limit(1);

      if (firstEmployeeOrgId.length > 0) {
        const org = await db
          .select({ name: organizations.name })
          .from(organizations)
          .where(eq(organizations.id, firstEmployeeOrgId[0].organizationId))
          .limit(1);

        if (org.length > 0) {
          organizationName = org[0].name;
        }
      }
    }

    return NextResponse.json({
      organizationName,
      employees: results,
    });
  } catch (error) {
    console.error('Error fetching org chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizational chart data' },
      { status: 500 }
    );
  }
}
