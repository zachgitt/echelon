import { NextResponse } from 'next/server';
import { getActiveEmployees } from '@/lib/employees/queries';
import { getAuthenticatedUser } from '@/lib/auth/user';

export async function GET() {
  try {
    // Get authenticated user's organization
    const { organizationId } = await getAuthenticatedUser();

    const managers = await getActiveEmployees(organizationId);
    return NextResponse.json(managers);
  } catch (error) {
    console.error('Error fetching managers:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch managers' },
      { status: 500 }
    );
  }
}
