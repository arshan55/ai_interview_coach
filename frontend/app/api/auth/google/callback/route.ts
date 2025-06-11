import { NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const FRONTEND_URL = process.env.NEXT_PUBLIC_APP_URL;
const REDIRECT_URI = `${FRONTEND_URL}/api/auth/google/callback`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect('/login?error=No code provided');
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokens.error_description || 'Failed to get tokens');
    }

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      throw new Error('Failed to get user data');
    }

    // Create or update user in your database through the backend
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (FRONTEND_URL) {
      headers['Origin'] = FRONTEND_URL;
    }

    const response = await fetch(`${BACKEND_URL}/api/auth/google/user`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        googleId: userData.id,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create/update user');
    }

    // Set auth cookie and redirect to home
    const redirectResponse = NextResponse.redirect('/');
    redirectResponse.cookies.set('token', data.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? new URL(FRONTEND_URL!).hostname : undefined,
    });

    return redirectResponse;
  } catch (error: any) {
    console.error('Google auth error:', error);
    return NextResponse.redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
} 