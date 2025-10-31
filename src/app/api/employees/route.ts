import { NextRequest, NextResponse } from 'next/server';
import { getEmployees } from '@/lib/employees/queries';
import { db } from '@/lib/db';
import { employees, organizations } from '../../../../db/schema';
import type { EmployeeFilters, EmployeeFormData } from '@/types/employee';
import { createAuditLog } from '@/lib/audit/service';
import { getAuthenticatedUser } from '@/lib/auth/user';
import { createClient } from '@/lib/supabase/server';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user's organization
    const { organizationId } = await getAuthenticatedUser();

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

    const result = await getEmployees(organizationId, filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching employees:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

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

    // Get organization ID from user metadata (for onboarding) or from body (for regular employee creation)
    const organizationId = user.user_metadata?.organization_id || body.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with user' },
        { status: 404 }
      );
    }

    // Create employee - link to user if this is during onboarding
    const [newEmployee] = await db
      .insert(employees)
      .values({
        userId: user.id, // Link employee to authenticated user
        name: body.name,
        email: body.email,
        title: body.title,
        departmentId: body.departmentId,
        managerId: body.managerId || null,
        hireDate: new Date(body.hireDate),
        salary: body.salary || null,
        status: body.status || 'active',
        organizationId,
      })
      .returning();

    // If this is during onboarding (user has onboarding_completed: false), mark it as complete
    if (user.user_metadata?.onboarding_completed === false) {
      // Mark user's onboarding as complete
      await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
        },
      });

      // Mark organization's onboarding as complete (all 3 steps done)
      await db
        .update(organizations)
        .set({ onboardingCompleted: true })
        .where(eq(organizations.id, organizationId));
    }

    // Create audit log for employee creation
    await createAuditLog({
      entityType: 'employee',
      entityId: newEmployee.id,
      action: 'created',
      organizationId,
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
