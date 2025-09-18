import { NextResponse } from 'next/server';

export function middleware(request) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Paths that are protected (require authentication)
  const isProtectedPath = path === '/driver' || path === '/rider';

  // Check for JWT cookie
  const jwtCookie = request.cookies.get('jwt');

  // If trying to access protected route without JWT, redirect to login
  if (isProtectedPath && !jwtCookie) {
    return NextResponse.redirect(new URL('/authentication/login', request.url));
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: ['/driver', '/rider']
}