import { NextRequest, NextResponse } from 'next/server';
import { getEmployees } from '@/lib/employees/queries';
import { db } from '@/lib/db';
import { employees } from '../../../../db/schema';
import type { EmployeeFilters, EmployeeFormData } from '@/types/employee';
import { createAuditLog } from '@/lib/audit/service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters from query params
    const filters: EmployeeFilters = {
      search: searchParams.get('search') || undefined,
      status: searchParams.getAll('status') as any,
      departmentId: searchParams.getAll('departmentId'),
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '25'),
      sortBy: (searchParams.get('sortBy') as any) || 'name',
      sortOrder: (searchParams.get('sortOrder') as any) || 'asc',
    };

    const result = await getEmployees(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: EmployeeFormData = await request.json();

    // Validate required fields
    if (!body.name || !body.email || !body.title || !body.departmentId || !body.hireDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate that manager is not self (if provided)
    // Note: For new employees, this will be checked during update operations

    // Create employee
    const [newEmployee] = await db
      .insert(employees)
      .values({
        name: body.name,
        email: body.email,
        title: body.title,
        departmentId: body.departmentId,
        managerId: body.managerId || null,
        hireDate: new Date(body.hireDate),
        salary: body.salary || null,
        status: body.status || 'active',
        organizationId: body.organizationId,
      })
      .returning();

    // Create audit log for employee creation
    await createAuditLog({
      entityType: 'employee',
      entityId: newEmployee.id,
      action: 'created',
      organizationId: body.organizationId,
      newValues: {
        name: newEmployee.name,
        email: newEmployee.email,
        title: newEmployee.title,
        departmentId: newEmployee.departmentId,
        managerId: newEmployee.managerId,
        hireDate: newEmployee.hireDate,
        salary: newEmployee.salary,
        status: newEmployee.status,
      },
    });

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error: any) {
    console.error('Error creating employee:', error);

    // Handle unique constraint violations
    // Drizzle wraps the Postgres error in error.cause
    const pgError = error.cause || error;
    if (pgError.code === '23505') {
      // Check which constraint was violated
      if (pgError.constraint_name === 'employees_email_unique') {
        return NextResponse.json(
          { error: 'An employee with this email address already exists. Please use a different email.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'An employee with this information already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
