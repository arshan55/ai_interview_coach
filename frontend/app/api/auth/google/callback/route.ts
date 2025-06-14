import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Ensure REDIRECT_URI is dynamic for local and production environments
const REDIRECT_URI = process.env.NODE_ENV === 'production' 
  ? `${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL}/api/auth/google/callback`
  : 'http://localhost:3000/api/auth/google/callback';

// Force dynamic rendering and use edge runtime
export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    console.log('Google callback received');
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      console.error('No code provided in Google callback');
      return NextResponse.redirect(new URL('/login?error=No code provided', request.url));
    }

    console.log('Exchanging code for tokens...');
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
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(new URL('/login?error=Failed to exchange code', request.url));
    }

    const tokens = await tokenResponse.json();
    console.log('Successfully exchanged code for tokens');

    // Get user info
    console.log('Fetching user info from Google...');
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('User info fetch failed:', errorText);
      return NextResponse.redirect(new URL('/login?error=Failed to get user info', request.url));
    }

    const userData = await userResponse.json();
    console.log('Successfully fetched user info:', userData.email);

    // Create or update user in our backend
    console.log('Creating/updating user in backend...');
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
      const errorText = await backendResponse.text();
      console.error('Backend user creation failed:', errorText);
      return NextResponse.redirect(new URL('/login?error=Failed to create user', request.url));
    }

    const { token } = await backendResponse.json();
    console.log('Successfully created/updated user and got token');

    // Remove server-side redirect to ensure client-side script executes
    // const response = NextResponse.redirect(new URL('/', request.url));
    
    // Set the token in a cookie (optional, but good for SSR/security)
    // response.cookies.set('token', token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'lax',
    //   maxAge: 60 * 60 * 24 * 7, // 1 week
    // });

    // Add a script to set the token in localStorage and then redirect
    const html = `
      <html>
        <body>
          <script>
            localStorage.setItem('token', '${token}');
            window.location.href = '/';
          </script>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error in Google callback:', error);
    return NextResponse.redirect(new URL('/login?error=Internal server error', request.url));
  }
} 