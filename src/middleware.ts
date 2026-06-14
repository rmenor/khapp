import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './lib/auth-session';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/finance',
  '/annual-assignments',
  '/publishers',
  '/groups',
  '/privileges',
  '/settings',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read cookie
  const sessionCookie = request.cookies.get('__session')?.value;
  const isSessionValid = await verifySession(sessionCookie);

  // Check if it matches any protected route
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route)) || pathname === '/';

  if (isProtectedRoute) {
    if (!isSessionValid) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    if (pathname === '/') {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Redirect authenticated users trying to access login
  if (pathname === '/login' && isSessionValid) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (manifest file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|requests/pub).*)',
  ],
};
