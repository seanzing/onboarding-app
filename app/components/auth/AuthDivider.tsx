/**
 * AuthDivider Component
 *
 * "Or continue with" style divider for authentication forms
 * Universal - works on web and React Native
 */

// @ts-nocheck - Tamagui typing issues with children props
'use client'

import { XStack, Text, Separator } from 'tamagui'

export interface AuthDividerProps {
  text?: string
}

export function AuthDivider({ text = 'or' }: AuthDividerProps) {
  return (
    <XStack alignItems="center" space="$4" width="100%">
      <Separator flex={1} borderColor="$borderColor" />
      <Text
        fontSize="$3"
        color="$color"
        opacity={0.5}
        fontWeight="500"
        textTransform="uppercase"
      >
        {text}
      </Text>
      <Separator flex={1} borderColor="$borderColor" />
    </XStack>
  )
}
