/**
 * Next.js Middleware for Authentication
 *
 * This middleware handles session management and route protection using Supabase Auth.
 *
 * NOTE: Build warnings about Edge Runtime compatibility (process.versions, process.version)
 * come from @supabase/ssr and @supabase/realtime-js packages. These are EXPECTED and do not
 * affect functionality. The warnings occur because Supabase packages check Node.js version
 * for WebSocket implementation selection, but they have proper fallbacks for Edge Runtime.
 *
 * @see https://github.com/supabase/supabase-js/issues/1020
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/signup') ||
                     request.nextUrl.pathname.startsWith('/api/auth')

  // Protect ALL pages except auth pages and API routes
  const isProtectedPage = !isAuthPage && !request.nextUrl.pathname.startsWith('/api')

  // API routes that require authentication
  // Note: /api/sync requires CRON_SECRET OR authenticated user
  const isProtectedAPI = request.nextUrl.pathname.startsWith('/api/hubspot') ||
                         request.nextUrl.pathname.startsWith('/api/supabase') ||
                         request.nextUrl.pathname.startsWith('/api/pipedream') ||
                         request.nextUrl.pathname.startsWith('/api/admin') ||
                         request.nextUrl.pathname.startsWith('/api/sync') ||
                         request.nextUrl.pathname.startsWith('/api/onboarding')

  // Special case: Allow CRON_SECRET for /api/sync routes (for automated cron jobs)
  const isSyncRoute = request.nextUrl.pathname.startsWith('/api/sync')
  const authHeader = request.headers.get('authorization')
  const cronSecret = authHeader?.replace('Bearer ', '')
  const isValidCronAuth = isSyncRoute && cronSecret && cronSecret === process.env.CRON_SECRET

  // If not authenticated and trying to access protected API, return 401
  // Exception: Allow CRON_SECRET for sync routes
  if (!user && isProtectedAPI && !isValidCronAuth) {
    console.log('[Middleware] Blocking unauthenticated API request:', request.nextUrl.pathname)
    return new NextResponse(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    )
  }

  // If not authenticated and trying to access protected page, redirect to login
  if (!user && isProtectedPage) {
    const redirectUrl = new URL('/login', request.url)
    // Preserve full path including query parameters
    const fullPath = request.nextUrl.pathname + request.nextUrl.search
    redirectUrl.searchParams.set('redirectTo', fullPath)
    console.log('[Middleware] Redirecting unauthenticated user to:', redirectUrl.toString())
    return NextResponse.redirect(redirectUrl)
  }

  // If authenticated and trying to access auth pages, redirect to dashboard
  if (user && isAuthPage) {
    console.log('[Middleware] Redirecting authenticated user to dashboard')
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
