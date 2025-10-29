import { NextResponse } from 'next/server';
import { getActiveEmployees } from '@/lib/employees/queries';

export async function GET() {
  try {
    const managers = await getActiveEmployees();
    return NextResponse.json(managers);
  } catch (error) {
    console.error('Error fetching managers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch managers' },
      { status: 500 }
    );
  }
}
