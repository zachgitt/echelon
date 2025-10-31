import { NextRequest, NextResponse } from 'next/server';
import { getDepartments } from '@/lib/employees/queries';
import { getAuthenticatedUser } from '@/lib/auth/user';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { departments } from '../../../../db/schema';

export async function GET() {
  try {
    // Get authenticated user's organization
    const { organizationId } = await getAuthenticatedUser();

    const departments = await getDepartments(organizationId);
    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

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
    const { name, description } = body;

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

    // Create department
    const [newDept] = await db
      .insert(departments)
      .values({
        name,
        description: description || null,
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
