import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function GET() {
  try {
    const headersList = headers();
    const token = headersList.get('authorization');

    console.log('Backend URL:', BACKEND_URL);
    console.log('Authorization token present:', !!token);

    if (!token) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const url = `${BACKEND_URL}/api/interviews/user`;
    console.log('Making request to:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      console.log('Error response content type:', contentType);

      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        console.log('Error data:', errorData);
        return NextResponse.json(
          { error: errorData?.error || 'Failed to fetch interviews' },
          { status: response.status }
        );
      } else {
        const text = await response.text();
        console.log('Non-JSON error response:', text);
        return NextResponse.json(
          { error: 'Failed to fetch interviews. Please try again later.' },
          { status: response.status }
        );
      }
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