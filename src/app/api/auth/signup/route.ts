import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organizations } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Signup request received');
    const body = await request.json();
    const { email, password, name } = body;
    console.log('[API] Signup for email:', email, 'name:', name);

    // Validate required fields
    if (!email || !password || !name) {
      console.error('[API] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Extract domain from email
    const domain = email.split('@')[1];
    if (!domain) {
      console.error('[API] Invalid email format');
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    console.log('[API] Email domain:', domain);

    // Create auth user first
    console.log('[API] Creating Supabase auth user...');
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
      console.error('[API] Supabase auth error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      console.error('[API] No user returned from Supabase');
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }
    console.log('[API] Supabase user created:', authData.user.id);

    // Check if organization with this domain exists
    console.log('[API] Checking for existing organization with domain:', domain);
    let [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.domain, domain))
      .limit(1);

    // If no organization exists, create one with the domain as the name
    if (!org) {
      console.log('[API] Creating new organization for domain:', domain);
      [org] = await db
        .insert(organizations)
        .values({
          domain,
          name: domain, // Default to domain, will be updated during onboarding
          description: null,
        })
        .returning();
      console.log('[API] Organization created:', org.id);
    } else {
      console.log('[API] Found existing organization:', org.id);
    }

    // Check if organization has completed onboarding
    // If yes, this is a second+ user and they only need to create their employee profile
    const skipToEmployeeStep = org.onboardingCompleted === true;
    console.log('[API] Organization onboarding completed:', org.onboardingCompleted);
    console.log('[API] Skip to employee step:', skipToEmployeeStep);

    // Store organization ID in user metadata for onboarding flow
    console.log('[API] Updating user metadata with organization_id:', org.id);
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        organization_id: org.id,
        onboarding_completed: false, // User still needs to complete their own profile
        skip_to_employee_step: skipToEmployeeStep, // Flag to skip org/dept steps
      },
    });

    if (updateError) {
      console.error('[API] Error updating user metadata:', updateError);
    } else {
      console.log('[API] User metadata updated successfully');
    }

    console.log('[API] Signup successful, returning response');
    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please complete onboarding.',
      requiresOnboarding: true,
      organizationId: org.id,
      skipToEmployeeStep,
    });
  } catch (error: any) {
    console.error('[API] Signup error:', error);
    console.error('[API] Error stack:', error.stack);
    console.error('[API] Error code:', error.code);

    // Handle unique constraint violations
    if (error.code === '23505') {
      console.error('[API] Unique constraint violation');
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
