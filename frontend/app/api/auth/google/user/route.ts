import { NextResponse } from 'next/server';
import * as jose from 'jose';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(request: Request) {
  try {
    const { email, name, picture, googleId } = await request.json();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          profilePicture: picture,
          googleId,
          role: 'USER',
        },
      });
    } else if (!user.googleId) {
      // Update existing user with Google ID
      user = await prisma.user.update({
        where: { email },
        data: {
          googleId,
          profilePicture: picture,
        },
      });
    }

    // Generate JWT token using jose
    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new jose.SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret);

    return NextResponse.json({ token });
  } catch (error: any) {
    console.error('Error in Google user handler:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 