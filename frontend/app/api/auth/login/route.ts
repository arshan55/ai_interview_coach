import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('Attempting login for:', email);
    console.log('Backend URL:', BACKEND_URL);

    const response = await fetch(`${BACKEND_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
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
          { error: errorData.error || 'Login failed' },
          { status: response.status }
        );
      } else {
        const text = await response.text();
        console.error('Non-JSON error response:', text);
        return NextResponse.json(
          { error: 'Failed to login. Please try again later.' },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    console.log('Login successful for:', email);

    const res = NextResponse.json(data);
    
    // Set the token in a cookie
    res.cookies.set('token', data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 