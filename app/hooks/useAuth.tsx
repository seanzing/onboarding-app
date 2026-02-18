/**
 * Universal Auth Context & Hooks
 *
 * Provides authentication state management across the app
 * Works on both Web and React Native
 */

'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('[Auth] Auth check timeout - setting loading to false')
      setLoading(false)
    }, 3000) // 3 second timeout

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      clearTimeout(timeout) // Clear timeout if we get a response

      if (error) {
        console.error('[Auth] Error getting session:', error)
      }

      console.log('[Auth] Initial session check:', session ? `User: ${session.user?.email}` : 'No session')
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch((err) => {
      clearTimeout(timeout)
      console.error('[Auth] Error in getSession:', err)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('[Auth] Auth state changed:', event, session ? `User: ${session.user?.email}` : 'No session')

        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle specific auth events
        switch (event) {
          case 'SIGNED_IN':
            console.log('[Auth] User signed in:', session?.user?.email)
            break
          case 'SIGNED_OUT':
            console.log('[Auth] User signed out')
            break
          case 'TOKEN_REFRESHED':
            console.log('[Auth] Token refreshed')
            break
          case 'USER_UPDATED':
            console.log('[Auth] User updated')
            break
        }
      }
    )

    // Cleanup subscription and timeout on unmount
    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('[Auth] Error signing out:', error)
      throw error
    }
  }

  const value = {
    user,
    session,
    loading,
    signOut: handleSignOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Main hook to get auth state
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook to get just the user
export function useUser() {
  const { user, loading } = useAuth()
  return { user, loading }
}

// Hook to get just the session
export function useSession() {
  const { session, loading } = useAuth()
  return { session, loading }
}

// Hook for sign out function
export function useSignOut() {
  const { signOut } = useAuth()
  return signOut
}

// Hook to check if user is authenticated
export function useIsAuthenticated() {
  const { user, loading } = useAuth()
  return { isAuthenticated: !!user, loading }
}
