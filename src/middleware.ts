import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const verifiedToken = token && (await verifyToken(token));

    // Protected routes
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        if (!verifiedToken) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // Auth routes (redirect to dashboard if already logged in)
    if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') {
        if (verifiedToken) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login', '/register'],
};
