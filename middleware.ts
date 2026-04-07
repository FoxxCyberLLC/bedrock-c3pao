import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decryptC3PAOSession } from './lib/auth-edge'

const PUBLIC_ROUTES = ['/login', '/setup']

// H6: API routes covered by middleware as a defense-in-depth layer.
// Individual handlers still call requireAuth() — middleware is an additional gate.
const PUBLIC_API_ROUTES = ['/api/health']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // ── API route handling ──────────────────────────────────────────────────
  if (path.startsWith('/api/')) {
    // Explicitly public API routes — no auth required
    if (PUBLIC_API_ROUTES.some((r) => path === r || path.startsWith(r + '/'))) {
      return NextResponse.next()
    }
    // All other API routes require a valid session (defense-in-depth)
    const cookie = request.cookies.get('bedrock_c3pao_session')?.value
    const session = cookie ? await decryptC3PAOSession(cookie) : null
    const isValidSession = session && new Date(session.expires) > new Date()
    if (!isValidSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // ── Page route handling ─────────────────────────────────────────────────
  const isPublicRoute = PUBLIC_ROUTES.some((route) => path.startsWith(route))
  const isSetupRoute = path.startsWith('/setup')
  const isAdminRoute = path.startsWith('/admin')

  // Check if instance has been configured. After cold start, instrumentation.ts
  // loads config from PostgreSQL into process.env. For first-time setup within
  // a single container life, completeSetup() sets process.env in the Server
  // Action context but the Edge middleware can't see those changes — so we
  // also accept the bedrock_instance_configured cookie set by completeSetup.
  // Forging the cookie only lets a user skip the /setup page (they still hit
  // /login which requires real auth), so it's safe as a UX gate.
  const isConfigured =
    !!process.env.INSTANCE_API_KEY ||
    request.cookies.get('bedrock_instance_configured')?.value === 'true'

  // If not configured and not on setup page → redirect to setup
  if (!isConfigured && !isSetupRoute) {
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  // If configured and on setup page → redirect to login
  if (isConfigured && isSetupRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Setup page doesn't need auth checks
  if (isSetupRoute) {
    return NextResponse.next()
  }

  const cookie = request.cookies.get('bedrock_c3pao_session')?.value
  const session = cookie ? await decryptC3PAOSession(cookie) : null

  // Check session expiry
  const isValidSession = session && new Date(session.expires) > new Date()

  // If on login page and already authenticated, redirect appropriately
  if (isPublicRoute && isValidSession) {
    return NextResponse.redirect(new URL(session.isLocalAdmin ? '/admin' : '/', request.url))
  }

  // If not on a public route and not authenticated, redirect to login
  if (!isPublicRoute && !isValidSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protect /admin routes — only local admin can access
  if (isAdminRoute && isValidSession && !session.isLocalAdmin) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Prevent local admin from accessing assessment routes
  if (!isAdminRoute && !isPublicRoute && isValidSession && session.isLocalAdmin) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets (SVG)
     *
     * Note: /api routes are now INCLUDED so middleware can enforce auth as a
     * defense-in-depth layer. /api/health is explicitly excluded above.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)',
  ],
}
