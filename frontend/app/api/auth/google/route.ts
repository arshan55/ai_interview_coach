import { NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
// Use the actual Vercel deployment URL - must match exactly what's in Google Cloud Console
const REDIRECT_URI = process.env.NODE_ENV === 'production' 
  ? 'https://ai-interview-coach-delta.vercel.app/api/auth/google/callback'
  : 'http://localhost:3000/api/auth/google/callback';

if (!GOOGLE_CLIENT_ID) {
  console.error('GOOGLE_CLIENT_ID is not set in environment variables');
}

export async function GET() {
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured properly' },
      { status: 500 }
    );
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('email profile')}` +
    `&access_type=offline` +
    `&prompt=consent`;

  console.log('Redirecting to Google OAuth with URI:', REDIRECT_URI);
  return NextResponse.redirect(authUrl);
} 