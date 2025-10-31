import { NextResponse } from 'next/server';
import { getDepartments } from '@/lib/employees/queries';
import { getAuthenticatedUser } from '@/lib/auth/user';

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
