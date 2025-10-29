import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeById } from '@/lib/employees/queries';
import { db } from '@/lib/db';
import { employees } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';
import type { EmployeeFormData } from '@/types/employee';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employee = await getEmployeeById(id);

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Validate that manager is not self
    if (body.managerId === id) {
      return NextResponse.json(
        { error: 'An employee cannot be their own manager' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const existingEmployee = await getEmployeeById(id);
    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Update employee
    const [updatedEmployee] = await db
      .update(employees)
      .set({
        name: body.name,
        email: body.email,
        title: body.title,
        departmentId: body.departmentId,
        managerId: body.managerId || null,
        hireDate: new Date(body.hireDate),
        salary: body.salary || null,
        status: body.status,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();

    return NextResponse.json(updatedEmployee);
  } catch (error: any) {
    console.error('Error updating employee:', error);

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
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if employee exists
    const existingEmployee = await getEmployeeById(id);
    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting status to terminated
    const [deletedEmployee] = await db
      .update(employees)
      .set({
        status: 'terminated',
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();

    return NextResponse.json(deletedEmployee);
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    );
  }
}
