/**
 * Auth Callback Route
 *
 * Handles OAuth callbacks and email confirmations from Supabase
 * Exchanges the code for a session and redirects to the dashboard
 */

import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  console.log('[AuthCallback] Callback received:', {
    code: code ? 'present' : 'missing',
    error,
    error_description,
  })

  // Handle errors from Supabase
  if (error) {
    console.error('[AuthCallback] Error from Supabase:', error, error_description)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error_description || error)}`, requestUrl.origin)
    )
  }

  // Exchange code for session
  if (code) {
    try {
      // Create a response object first
      let response = NextResponse.redirect(new URL('/', requestUrl.origin))

      // Create Supabase client with SSR for proper cookie handling
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
              response.cookies.set({
                name,
                value: '',
                ...options,
              })
            },
          },
        }
      )

      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('[AuthCallback] Failed to exchange code:', exchangeError)
        return NextResponse.redirect(
          new URL(
            `/login?error=${encodeURIComponent(exchangeError.message)}`,
            requestUrl.origin
          )
        )
      }

      console.log('[AuthCallback] Successfully exchanged code for session:', data.user?.email)

      // Return the response with cookies set
      return response
    } catch (err) {
      console.error('[AuthCallback] Unexpected error:', err)
      return NextResponse.redirect(
        new URL('/login?error=An unexpected error occurred', requestUrl.origin)
      )
    }
  }

  // No code or error - redirect to login
  console.warn('[AuthCallback] No code or error present in callback')
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
