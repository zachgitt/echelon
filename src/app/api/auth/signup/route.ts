import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { employees, organizations, departments } from '../../../../../db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Extract domain from email
    const domain = email.split('@')[1];
    if (!domain) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if organization with this domain exists
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.domain, domain))
      .limit(1);

    if (!org) {
      return NextResponse.json(
        { error: `No organization found for domain "${domain}". Please contact your administrator.` },
        { status: 403 }
      );
    }

    // Create auth user
    const supabase = await createServerClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Check if employee with this email already exists
    const [existingEmployee] = await db
      .select()
      .from(employees)
      .where(and(
        eq(employees.email, email),
        eq(employees.organizationId, org.id)
      ))
      .limit(1);

    if (existingEmployee) {
      // Link existing employee to new auth user
      await db
        .update(employees)
        .set({
          userId: authData.user.id,
          updatedAt: new Date(),
        })
        .where(eq(employees.id, existingEmployee.id));

      return NextResponse.json({
        success: true,
        message: 'Account created and linked to existing employee record',
        employeeId: existingEmployee.id,
      });
    } else {
      // Get default department (or create one if needed)
      let [defaultDept] = await db
        .select()
        .from(departments)
        .where(eq(departments.organizationId, org.id))
        .limit(1);

      if (!defaultDept) {
        // Create default department for first employee
        [defaultDept] = await db
          .insert(departments)
          .values({
            name: 'General',
            description: 'Default department',
            organizationId: org.id,
          })
          .returning();
      }

      // Create new employee record
      const [newEmployee] = await db
        .insert(employees)
        .values({
          userId: authData.user.id,
          name,
          email,
          title: 'Employee', // Default title, can be updated later
          departmentId: defaultDept.id,
          organizationId: org.id,
          hireDate: new Date(),
          status: 'active',
        })
        .returning();

      return NextResponse.json({
        success: true,
        message: 'Account created successfully',
        employeeId: newEmployee.id,
      });
    }
  } catch (error: any) {
    console.error('Signup error:', error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
