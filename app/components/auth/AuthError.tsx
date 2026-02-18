/**
 * AuthError Component
 *
 * Error alert banner for authentication forms
 * Universal - works on web and React Native
 */

// @ts-nocheck - Tamagui typing issues
'use client'

import { XStack, YStack, Text } from 'tamagui'
import { AlertCircle } from 'lucide-react'

export interface AuthErrorProps {
  message: string
}

export function AuthError({ message }: AuthErrorProps) {
  if (!message) return null

  return (
    <YStack
      backgroundColor="rgba(239, 68, 68, 0.1)"
      borderWidth={1}
      borderColor="$errorRed"
      borderRadius="$4"
      padding="$4"
      animation="smooth"
    >
      <XStack space="$3" alignItems="center">
        <AlertCircle size={20} color="var(--errorRed)" />
        <Text
          fontSize="$3"
          color="$errorRed"
          flex={1}
          flexWrap="wrap"
        >
          {message}
        </Text>
      </XStack>
    </YStack>
  )
}
