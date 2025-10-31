import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { departments } from '../../../../../db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * DELETE /api/departments/[id]
 * Deletes a department by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
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

    const departmentId = params.id;

    // Validate department ID
    if (!departmentId) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      );
    }

    // Verify the department belongs to the user's organization before deleting
    const [existingDept] = await db
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.id, departmentId),
          eq(departments.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!existingDept) {
      return NextResponse.json(
        { error: 'Department not found or does not belong to your organization' },
        { status: 404 }
      );
    }

    // Delete the department
    await db
      .delete(departments)
      .where(eq(departments.id, departmentId));

    return NextResponse.json({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete department error:', error);

    // Handle foreign key constraint violations (e.g., if employees are assigned to this department)
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Cannot delete department because employees are assigned to it' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/departments/[id]
 * Updates a department by ID
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const departmentId = params.id;

    // Validate department ID
    if (!departmentId) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      );
    }

    // Verify the department belongs to the user's organization before updating
    const [existingDept] = await db
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.id, departmentId),
          eq(departments.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!existingDept) {
      return NextResponse.json(
        { error: 'Department not found or does not belong to your organization' },
        { status: 404 }
      );
    }

    // Update the department
    const [updatedDept] = await db
      .update(departments)
      .set({
        name,
        description: description || null,
        updatedAt: new Date(),
      })
      .where(eq(departments.id, departmentId))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Department updated successfully',
      department: updatedDept,
    });
  } catch (error: any) {
    console.error('Update department error:', error);

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
