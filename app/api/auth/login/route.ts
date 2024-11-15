import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { createToken } from '@/app/utils/auth';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create safe user object without password
    const safeUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      active: user.active
    };

    // Create JWT token
    const token = await createToken({ userId: safeUser.id, email: safeUser.email });

    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400 // 24 hours
    });

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error during login' },
      { status: 500 }
    );
  }
}