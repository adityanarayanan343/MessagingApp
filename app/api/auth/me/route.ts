import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/app/utils/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token.value);
    if (!payload || typeof payload === 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch complete user data from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 