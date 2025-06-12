import { NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const REDIRECT_URI = 'https://ai-coach-frontend.vercel.app/api/auth/google/callback';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=No code provided', request.url));
    }

    // Exchange the code for tokens
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

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(new URL('/login?error=Failed to exchange code', request.url));
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error('User info fetch failed:', await userResponse.text());
      return NextResponse.redirect(new URL('/login?error=Failed to get user info', request.url));
    }

    const userData = await userResponse.json();

    // Create or update user in our backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/google/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        googleId: userData.id,
      }),
    });

    if (!backendResponse.ok) {
      console.error('Backend user creation failed:', await backendResponse.text());
      return NextResponse.redirect(new URL('/login?error=Failed to create user', request.url));
    }

    const { token } = await backendResponse.json();

    // Create a response with the user data and tokens
    const response = NextResponse.redirect(new URL('/', request.url));
    
    // Set the token in a cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return response;
  } catch (error) {
    console.error('Error in Google callback:', error);
    return NextResponse.redirect(new URL('/login?error=Internal server error', request.url));
  }
} 