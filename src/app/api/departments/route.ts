import { NextRequest, NextResponse } from 'next/server';
import { getDepartments } from '@/lib/employees/queries';
import { getAuthenticatedUser } from '@/lib/auth/user';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { departments } from '../../../../db/schema';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // During onboarding, get organization ID from user metadata
    // After onboarding, it would come from employee record
    const organizationId = user.user_metadata?.organization_id;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with user' },
        { status: 404 }
      );
    }

    const departments = await getDepartments(organizationId);
    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);

    return NextResponse.json(
      { error: 'Failed to fetch departments' },
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

    const body = await request.json();
    const { name, description, parentDepartmentId } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      );
    }

    // Get organization ID from user metadata
    const organizationId = user.user_metadata?.organization_id;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with user' },
        { status: 404 }
      );
    }

    // If parentDepartmentId is provided, validate it exists and belongs to the organization
    if (parentDepartmentId) {
      const { eq, and } = await import('drizzle-orm');
      const [parentDept] = await db
        .select()
        .from(departments)
        .where(
          and(
            eq(departments.id, parentDepartmentId),
            eq(departments.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!parentDept) {
        return NextResponse.json(
          { error: 'Parent department not found or does not belong to your organization' },
          { status: 404 }
        );
      }
    }

    // Create department
    const [newDept] = await db
      .insert(departments)
      .values({
        name,
        description: description || null,
        parentDepartmentId: parentDepartmentId || null,
        organizationId,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Department created successfully',
      department: newDept,
    });
  } catch (error: any) {
    console.error('Create department error:', error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A department with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
