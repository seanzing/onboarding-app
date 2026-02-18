/**
 * Login Page
 *
 * Email and password authentication
 * Universal - works on web and React Native
 */

// @ts-nocheck - Tamagui typing issues with children props
'use client'

import { useState } from 'react'
import { YStack, Text } from 'tamagui'
import { Building2 } from 'lucide-react'
import { AuthCard, AuthInput, AuthButton, AuthError } from '@/app/components/auth'
import { supabase } from '@/lib/supabase/client'
import ClientOnly from '@/app/components/ClientOnly'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      // Get redirect URL from query params or default to dashboard
      const params = new URLSearchParams(window.location.search)
      const redirectTo = params.get('redirectTo') || '/'

      // Force a hard navigation to trigger middleware check
      window.location.href = redirectTo
    } catch (error: any) {
      // Properly extract error message
      let errorMessage = 'Failed to sign in. Please try again.'

      if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object') {
        if (error.message && typeof error.message === 'string') {
          errorMessage = error.message
        } else if (error.error_description && typeof error.error_description === 'string') {
          errorMessage = error.error_description
        }
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ClientOnly>
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        padding="$6"
        backgroundColor="#0A0E27"
        style={{
          background: 'linear-gradient(135deg, #0A0E27 0%, #151B3D 50%, #1a2040 100%)',
        }}
        // @ts-ignore - Tamagui responsive prop typing
        $sm={{ padding: '$4' }}
      >
        <AuthCard>
          {/* Logo & Title */}
          <YStack space="$4" alignItems="center">
            <YStack
              width={64}
              height={64}
              borderRadius="$5"
              backgroundColor="rgba(170, 64, 255, 0.15)"
              borderWidth={1}
              borderColor="rgba(170, 64, 255, 0.3)"
              justifyContent="center"
              alignItems="center"
              shadowColor="rgba(170, 64, 255, 0.3)"
              shadowRadius={12}
              shadowOffset={{ width: 0, height: 4 }}
            >
              <Building2 size={34} color="var(--zingPurple)" strokeWidth={2.5} />
            </YStack>
            <YStack space="$2" alignItems="center">
              <Text fontSize="$8" fontWeight="700" color="$color">
                Welcome Back
              </Text>
              <Text fontSize="$4" color="$color" opacity={0.6} textAlign="center">
                Sign in to Zing Local Directory Sync
              </Text>
            </YStack>
          </YStack>

          {/* Error Message */}
          {error && <AuthError message={error} />}

          {/* Login Form */}
          <YStack
            space="$5"
            tag="form"
            onSubmit={handleLogin}
          >
            <AuthInput
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              required
            />

            <AuthInput
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              required
            />

            {/* Sign In Button */}
            <AuthButton
              variant="primary"
              loading={loading}
              onPress={handleLogin}
            >
              Sign In
            </AuthButton>
          </YStack>

        </AuthCard>
      </YStack>
    </ClientOnly>
  )
}
