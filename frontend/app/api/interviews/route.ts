import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Force dynamic rendering and use edge runtime for this proxy route
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const headersList = headers();
    const token = headersList.get('authorization');

    const body = await request.json();

    console.log('Frontend /api/interviews POST received. Forwarding to backend...');
    console.log('Backend URL for interviews:', `${BACKEND_URL}/api/interviews`);

    const response = await fetch(`${BACKEND_URL}/api/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token || '', // Forward authorization token
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error forwarding interview request to backend:', response.status, errorText);
      return new NextResponse(errorText, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in frontend /api/interviews POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error at frontend interviews proxy' },
      { status: 500 }
    );
  }
} 