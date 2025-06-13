import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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

    const body = await request.json();

    console.log(`Frontend /api/interviews/${id}/answer POST received. Forwarding to backend...`);

    const response = await fetch(`${BACKEND_URL}/api/interviews/${id}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { detail: errorText || 'Failed to submit answer' };
      }
      console.error(`Error forwarding answer submission to backend: ${response.status}`, errorData);
      return new NextResponse(
        JSON.stringify({ error: errorData.detail || errorData.error || 'Failed to submit answer' }),
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
    console.error('Error in frontend /api/interviews/[id]/answer POST route:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error at frontend answer proxy' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 