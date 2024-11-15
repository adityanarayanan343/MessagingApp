import { NextResponse } from 'next/server';
import { verifyToken } from '@/app/utils/auth';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token');

  if (!token && request.nextUrl.pathname.startsWith('/home')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (token) {
    try {
      const payload = await verifyToken(token.value);
      if (!payload) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/home/:path*'
}; 