import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decryptC3PAOSession } from './lib/auth-edge'

const PUBLIC_ROUTES = ['/login']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  const isPublicRoute = PUBLIC_ROUTES.some((route) => path.startsWith(route))

  const cookie = request.cookies.get('bedrock_c3pao_session')?.value
  const session = cookie ? await decryptC3PAOSession(cookie) : null

  // Check session expiry
  const isValidSession = session && new Date(session.expires) > new Date()

  // If on login page and already authenticated, redirect to dashboard
  if (isPublicRoute && isValidSession) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If not on a public route and not authenticated, redirect to login
  if (!isPublicRoute && !isValidSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)',
  ],
}
