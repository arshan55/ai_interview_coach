import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

// Force dynamic rendering and edge runtime
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// Prevent static optimization
export const fetchCache = 'force-no-store';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const cookieStore = cookies();
    const token = cookieStore.get('token');

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('NEXT_PUBLIC_BACKEND_URL is not defined');
    }

    const response = await fetch(`${backendUrl}/api/interviews/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(errorData, { status: response.status });
      } catch (parseError) {
        // If it's not valid JSON, return the raw text with a generic error status
        return NextResponse.json({ message: `Backend error: ${errorText}` }, { status: response.status || 500 });
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in GET /api/interviews/[id]:', error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');

    if (!authHeader) {
      return new NextResponse(
        JSON.stringify({ error: 'Authorization header is required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/interviews/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to delete interview' }));
      return new NextResponse(
        JSON.stringify({ error: errorData.detail || 'Failed to delete interview' }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    return new NextResponse(
      JSON.stringify(data),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error deleting interview:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 