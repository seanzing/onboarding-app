/**
 * Supabase Browser Client
 *
 * Uses @supabase/ssr for proper cookie-based authentication
 * This ensures the client and middleware share the same auth state
 */

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Create browser client with cookie-based storage
// This automatically syncs with the middleware
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('[Supabase] Error fetching user:', error.message)
    return null
  }
  return user
}

// Helper function to get current session
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    console.error('[Supabase] Error fetching session:', error.message)
    return null
  }
  return session
}

// Helper function to sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('[Supabase] Error signing out:', error.message)
    throw error
  }
}

console.log('[Supabase Client] Initialized with URL:', supabaseUrl)
