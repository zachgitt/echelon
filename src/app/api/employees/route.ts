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

    // Fetch organization to validate email domain
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Extract domain from employee email
    const emailDomain = body.email.split('@')[1];

    // Validate email domain matches organization domain
    if (emailDomain !== organization.domain) {
      return NextResponse.json(
        { error: `Email domain must match your organization's domain (@${organization.domain})` },
        { status: 400 }
      );
    }

    // Determine if this is the user's own profile during onboarding
    const isOwnProfile = user.user_metadata?.onboarding_completed === false;

    // Check if employee with this email already exists
    const [existingEmployee] = await db
      .select()
      .from(employees)
      .where(eq(employees.email, body.email))
      .limit(1);

    let newEmployee;

    if (existingEmployee) {
      // If this is during onboarding and the employee exists without a userId,
      // link the existing employee record to this user (they were bulk uploaded)
      if (isOwnProfile && existingEmployee.userId === null) {
        [newEmployee] = await db
          .update(employees)
          .set({
            userId: user.id,
            // Update fields with any new information provided during onboarding
            name: body.name,
            title: body.title,
            departmentId: body.departmentId,
            managerId: body.managerId || existingEmployee.managerId,
            hireDate: new Date(body.hireDate),
            salary: body.salary || existingEmployee.salary,
            status: body.status || existingEmployee.status,
          })
          .where(eq(employees.id, existingEmployee.id))
          .returning();

        // Create audit log for employee linking
        await createAuditLog({
          entityType: 'employee',
          entityId: newEmployee.id,
          action: 'updated',
          organizationId,
          oldValues: {
            userId: null,
            name: existingEmployee.name,
            title: existingEmployee.title,
            departmentId: existingEmployee.departmentId,
            managerId: existingEmployee.managerId,
            hireDate: existingEmployee.hireDate,
            salary: existingEmployee.salary,
            status: existingEmployee.status,
          },
          newValues: {
            userId: user.id,
            name: newEmployee.name,
            title: newEmployee.title,
            departmentId: newEmployee.departmentId,
            managerId: newEmployee.managerId,
            hireDate: newEmployee.hireDate,
            salary: newEmployee.salary,
            status: newEmployee.status,
            linkedDuringOnboarding: true,
          },
        });
      } else {
        // Employee already exists and either:
        // 1. Already has a userId (already claimed by another user)
        // 2. This is not during onboarding (admin creating a new employee)
        return NextResponse.json(
          { error: 'An employee with this email address already exists. Please use a different email.' },
          { status: 409 }
        );
      }
    } else {
      // Create new employee - link to user only if this is their own profile during onboarding
      [newEmployee] = await db
        .insert(employees)
        .values({
          userId: isOwnProfile ? user.id : null, // Only link to user for their own profile
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
    }

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
