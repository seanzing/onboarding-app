/**
 * AuthCard Component
 *
 * Reusable card wrapper for authentication forms
 * Matches the existing design system (consistent with StatCard, etc.)
 * Universal - works on web and React Native
 */

// @ts-nocheck - Tamagui responsive prop typing issues
'use client'

import { Card, YStack } from 'tamagui'
import type { ReactNode } from 'react'

export interface AuthCardProps {
  children?: ReactNode
  maxWidth?: number
}

export function AuthCard({
  children,
  maxWidth = 450,
  ...props
}: AuthCardProps) {
  return (
    <Card
      elevate
      size="$4"
      bordered
      borderWidth={1}
      borderColor="#1E2847"
      backgroundColor="#151B3D"  // Dark navy card
      padding="$8"
      borderRadius={16}
      maxWidth={maxWidth}
      width="100%"
      animation="smooth"
      shadowColor="rgba(0, 0, 0, 0.3)"
      shadowRadius={20}
      shadowOffset={{ width: 0, height: 4 }}
      $sm={{
        padding: '$6',
        maxWidth: '95%',
      }}
      {...props}
    >
      <YStack space="$6" width="100%">
        {children}
      </YStack>
    </Card>
  )
}
