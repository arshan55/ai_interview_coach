import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function GET() {
  try {
    const headersList = headers();
    const token = headersList.get('authorization');

    if (!token) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/interviews/user`, {
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.error || 'Failed to fetch interviews' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in interviews/user route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 