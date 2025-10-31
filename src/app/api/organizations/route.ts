import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organizations } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/organizations
 * Returns the organization for the authenticated user
 */
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

    // Get organization ID from user metadata
    const organizationId = user.user_metadata?.organization_id;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with user' },
        { status: 404 }
      );
    }

    // Fetch organization details
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      organization: org,
    });
  } catch (error: any) {
    console.error('Get organization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/organizations
 * Updates organization details during onboarding
 */
export async function PATCH(request: NextRequest) {
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
        { error: 'Organization name is required' },
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

    // Update organization
    const [updatedOrg] = await db
      .update(organizations)
      .set({
        name,
        description: description || null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))
      .returning();

    if (!updatedOrg) {
      return NextResponse.json(
        { error: 'Failed to update organization' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Organization updated successfully',
      organization: updatedOrg,
    });
  } catch (error: any) {
    console.error('Update organization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
