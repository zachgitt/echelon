import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { employees, departments } from '../../../../db/schema';
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

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching org chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizational chart data' },
      { status: 500 }
    );
  }
}
