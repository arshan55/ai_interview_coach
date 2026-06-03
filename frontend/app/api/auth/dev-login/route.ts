import { NextResponse } from 'next/server';
import { isDevLoginEnabled } from '@/lib/devAuth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  'http://localhost:5000';

export async function POST() {
  if (!isDevLoginEnabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || data.msg || 'Dev login failed' },
        { status: response.status }
      );
    }

    const res = NextResponse.json(data);
    if (data.token) {
      res.cookies.set('token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    return res;
  } catch (error) {
    console.error('Dev login proxy error:', error);
    return NextResponse.json(
      { error: 'Dev login proxy failed. Is the backend running?' },
      { status: 500 }
    );
  }
}
