import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organizations } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';

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

    // Create auth user first
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

    // Check if organization with this domain exists
    let [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.domain, domain))
      .limit(1);

    // If no organization exists, create one with the domain as the name
    if (!org) {
      [org] = await db
        .insert(organizations)
        .values({
          domain,
          name: domain, // Default to domain, will be updated during onboarding
          description: null,
        })
        .returning();
    }

    // Check if organization has completed onboarding
    // If yes, this is a second+ user and they only need to create their employee profile
    const skipToEmployeeStep = org.onboardingCompleted === true;

    // Store organization ID in user metadata for onboarding flow
    await supabase.auth.updateUser({
      data: {
        organization_id: org.id,
        onboarding_completed: false, // User still needs to complete their own profile
        skip_to_employee_step: skipToEmployeeStep, // Flag to skip org/dept steps
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please complete onboarding.',
      requiresOnboarding: true,
      organizationId: org.id,
      skipToEmployeeStep,
    });
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
